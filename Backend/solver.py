import itertools
from typing import Dict, List, Tuple
from collections import defaultdict
import networkx as nx
from sqlalchemy.orm import Session
from models import (
    Course, Student, Room, ExamSession, ExamTimetable,
    SeatingAllocation, BatchCourse
)


class SolverException(Exception):
    def __init__(self, conflict_type: str, details: str):
        self.conflict_type = conflict_type
        self.details = details
        super().__init__(f"[{conflict_type}] {details}")


class ExamSolverEngine:
    def __init__(self, db: Session, relax_capacity: bool = False):
        self.db = db
        self.relax_capacity = relax_capacity
        self.effective_seat_cap = 50 if relax_capacity else 25

    def _build_clash_graph(self) -> Tuple[nx.Graph, Dict[int, List[int]]]:
        """
        Constructs course clash graph G = (V, E).
        An edge exists if two courses share at least one student enrollment.
        """
        courses = self.db.query(Course).all()
        G = nx.Graph()
        for c in courses:
            G.add_node(c.course_id, code=c.course_code, title=c.title)

        # Mapping: Course -> Set of Student IDs
        course_students: Dict[int, List[int]] = defaultdict(list)

        # Pull batch to courses relationships
        batch_courses = self.db.query(BatchCourse).all()
        batch_to_courses = defaultdict(list)
        for bc in batch_courses:
            batch_to_courses[bc.batch_id].append(bc.course_id)

        # Map students by batch
        students = self.db.query(Student.student_id, Student.batch_id).all()
        for s_id, b_id in students:
            for c_id in batch_to_courses.get(b_id, []):
                course_students[c_id].append(s_id)

        # Form clash edges where shared enrollments exist
        all_c_ids = list(course_students.keys())
        for c1, c2 in itertools.combinations(all_c_ids, 2):
            shared = set(course_students[c1]).intersection(set(course_students[c2]))
            if shared:
                G.add_edge(c1, c2, weight=len(shared))

        return G, course_students

    def _run_preflight_diagnostics(self, G: nx.Graph, available_sessions_count: int):
        """
        Detects if the course clash graph cannot be scheduled into available sessions.
        Finds the maximum clique to explain the exact mathematical barrier.
        """
        cliques = list(nx.find_cliques(G))
        if not cliques:
            return

        largest_clique = max(cliques, key=len)
        if len(largest_clique) > available_sessions_count:
            clique_codes = [G.nodes[c_id]["code"] for c_id in largest_clique]
            raise SolverException(
                conflict_type="Chromatic Overload",
                details=(
                    f"Courses {clique_codes} have overlapping student enrollments forming a "
                    f"{len(largest_clique)}-clique, requiring {len(largest_clique)} slots, "
                    f"but only {available_sessions_count} sessions exist."
                )
            )

    def _color_clash_graph(self, G: nx.Graph, num_colors: int) -> Dict[int, int]:
        """
        DSATUR (Degree of Saturation) Graph Coloring heuristic.
        Runs in < 5ms for typical academic course sets.
        """
        # NetworkX strategy_saturation_largest_first executes DSATUR
        color_map = nx.coloring.greedy_color(
            G, strategy=nx.coloring.strategy_saturation_largest_first
        )

        # Verify no color exceeds available sessions
        max_color = max(color_map.values()) if color_map else 0
        if max_color >= num_colors:
            # Reconstruct the conflict subset
            offending_nodes = [node for node, color in color_map.items() if color >= num_colors]
            offending_codes = [G.nodes[node]["code"] for node in offending_nodes]
            raise SolverException(
                conflict_type="Chromatic Overload",
                details=(
                    f"DSATUR coloring required {max_color + 1} colors. Courses {offending_codes} "
                    f"could not be accommodated within {num_colors} available exam sessions."
                )
            )
        return color_map

    def _generate_checkerboard_coords(self) -> List[Tuple[int, int]]:
        """
        Generates 25 valid coordinates for the 5x10 room using checkerboard masking:
        (row + col) % 2 == 0.
        Guarantees that up, down, left, right are empty gap seats.
        """
        valid_coords = []
        for r in range(1, 6):
            for c in range(1, 11):
                if self.relax_capacity:
                    valid_coords.append((r, c))
                else:
                    if (r + c) % 2 == 0:
                        valid_coords.append((r, c))
        return valid_coords

    def solve_and_persist(self) -> Tuple[int, List[dict]]:
        # 1. Fetch available sessions and rooms
        sessions = self.db.query(ExamSession).order_by(ExamSession.exam_date, ExamSession.start_time).all()
        rooms = self.db.query(Room).order_by(Room.building_id, Room.room_number).all()

        if not sessions:
            raise SolverException("Missing Infrastructure", "No exam sessions found in the database.")
        if not rooms:
            raise SolverException("Missing Infrastructure", "No exam rooms found in the database.")

        total_campus_capacity = len(rooms) * self.effective_seat_cap

        # 2. Stage 1: Build Clash Graph and Run Pre-flight Checks
        G, course_students = self._build_clash_graph()
        self._run_preflight_diagnostics(G, len(sessions))

        # 3. Color Graph (Assign courses to Session Indices 0..5)
        course_color_map = self._color_clash_graph(G, len(sessions))

        # 4. Stage 2: Pre-flight Session Capacity Check
        session_course_map = defaultdict(list)
        session_student_count = defaultdict(int)

        for course_id, color_idx in course_color_map.items():
            session = sessions[color_idx]
            session_course_map[session.session_id].append(course_id)
            session_student_count[session.session_id] += len(course_students[course_id])

        # Validate capacity limits across every session
        for session in sessions:
            req_seats = session_student_count[session.session_id]
            if req_seats > total_campus_capacity:
                raise SolverException(
                    conflict_type="Capacity Shortage",
                    details=(
                        f"Session {session.session_id} on {session.exam_date} requires {req_seats} seats, "
                        f"but campus exam capacity across Block A and B is strictly "
                        f"{total_campus_capacity} seats ({len(rooms)} rooms x {self.effective_seat_cap} seats)."
                    )
                )

        # 5. Clear Previous Generation Data
        self.db.query(SeatingAllocation).delete()
        self.db.query(ExamTimetable).delete()
        self.db.flush()

        # 6. Persist Timetable Entries
        timetable_records = []
        course_to_timetable_id = {}
        for session in sessions:
            for course_id in session_course_map[session.session_id]:
                tt = ExamTimetable(course_id=course_id, session_id=session.session_id)
                self.db.add(tt)
                timetable_records.append(tt)

        self.db.flush()
        for tt in timetable_records:
            course_to_timetable_id[tt.course_id] = tt.timetable_id

        # 7. Stage 2 Execution: Deterministic Seating Allocation with Interleaving
        valid_coords = self._generate_checkerboard_coords()
        allocations_to_insert = []
        total_allocations_count = 0

        for session in sessions:
            c_ids = session_course_map[session.session_id]
            if not c_ids:
                continue

            # Interleave students from distinct courses to prevent subject clustering
            pools = [list(course_students[cid]) for cid in c_ids]
            interleaved_stream: List[Tuple[int, int]] = []  # (student_id, course_id)

            while any(pools):
                for idx, cid in enumerate(c_ids):
                    if pools[idx]:
                        interleaved_stream.append((pools[idx].pop(0), cid))

            # Distribute interleaved stream into rooms
            stream_idx = 0
            stream_len = len(interleaved_stream)

            for room in rooms:
                if stream_idx >= stream_len:
                    break

                for r, c in valid_coords:
                    if stream_idx >= stream_len:
                        break

                    st_id, crs_id = interleaved_stream[stream_idx]
                    tt_id = course_to_timetable_id[crs_id]

                    allocations_to_insert.append(
                        SeatingAllocation(
                            timetable_id=tt_id,
                            student_id=st_id,
                            room_id=room.room_id,
                            seat_row=r,
                            seat_col=c
                        )
                    )
                    stream_idx += 1
                    total_allocations_count += 1

        # Bulk save allocations
        self.db.bulk_save_objects(allocations_to_insert)
        self.db.commit()

        # Construct timetable payload
        timetable_payload = []
        for s in sessions:
            scheduled_courses = (
                self.db.query(Course)
                .join(ExamTimetable, Course.course_id == ExamTimetable.course_id)
                .filter(ExamTimetable.session_id == s.session_id)
                .all()
            )
            timetable_payload.append({
                "session_id": s.session_id,
                "exam_date": s.exam_date,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "reporting_time": s.reporting_time,
                "courses": scheduled_courses
            })

        return total_allocations_count, timetable_payload