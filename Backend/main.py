import time
from fastapi import FastAPI, Depends, Query, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

from database import get_db
from models import Student, Course, Room, ExamSession, Building, Batch, SeatingAllocation, ExamTimetable, AdminUser
from schemas import (
    GenerateTimetableRequest, GenerateTimetableResponse,
    SearchResultsResponse, StudentSearchOut, CourseSearchOut,
    RoomSearchOut, RoomSeatingResponse, SeatGridCell
)
from solver import ExamSolverEngine, SolverException
from auth import verify_password, create_access_token, get_current_admin, ACCESS_TOKEN_EXPIRE_MINUTES

app = FastAPI(
    title="Christ University Delhi-NCR - Exam Timetable & Seating Planner",
    version="2.0.0"
)

# Configure Cross-Origin Resource Sharing (CORS) for React / Frontend clients
origins = [
    "http://localhost:5173",
    "https://manavendra-dbms-miniproject.onrender.com"  # Replace this with your actual Render static site URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/api/timetable/generate",
    status_code=status.HTTP_200_OK
)
def generate_timetable(
    request: GenerateTimetableRequest = GenerateTimetableRequest(),
    db: Session = Depends(get_db)
):
    start_time = time.perf_counter()
    try:
        engine = ExamSolverEngine(db=db, relax_capacity=request.relax_capacity)
        total_allocations, timetable_payload = engine.solve_and_persist()
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "status": "success",
            "latency_ms": latency_ms,
            "total_allocations": total_allocations,
            "timetable": timetable_payload
        }
    except SolverException as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "failed",
                "conflict_type": exc.conflict_type,
                "details": exc.details
            }
        )


@app.get(
    "/api/search",
    response_model=SearchResultsResponse,
    status_code=status.HTTP_200_OK
)
def unified_search(
    query: str = Query(..., min_length=1, description="Fuzzy search across students, courses, and rooms"),
    db: Session = Depends(get_db)
):
    term = f"%{query.lower()}%"

    # 1. Search Students (by name or registration number)
    students = (
        db.query(Student.student_id, Student.register_no, Student.full_name, Batch.semester_label)
        .join(Batch, Student.batch_id == Batch.batch_id)
        .filter(
            func.lower(Student.full_name).like(term) |
            func.lower(Student.register_no).like(term)
        )
        .limit(10)
        .all()
    )

    # 2. Search Courses (by course code or title)
    courses = (
        db.query(Course.course_id, Course.course_code, Course.title, Course.is_open_elective)
        .filter(
            func.lower(Course.course_code).like(term) |
            func.lower(Course.title).like(term)
        )
        .limit(10)
        .all()
    )

    # 3. Search Rooms (by room number)
    rooms = (
        db.query(Room.room_id, Room.room_number, Building.name.label("building_name"), Room.floor_number)
        .join(Building, Room.building_id == Building.building_id)
        .filter(func.lower(Room.room_number).like(term))
        .limit(10)
        .all()
    )

    return {
        "students": [
            StudentSearchOut(
                student_id=s.student_id,
                register_no=s.register_no,
                full_name=s.full_name,
                semester_label=s.semester_label
            ) for s in students
        ],
        "courses": [
            CourseSearchOut(
                course_id=c.course_id,
                course_code=c.course_code,
                title=c.title,
                is_open_elective=c.is_open_elective
            ) for c in courses
        ],
        "rooms": [
            RoomSearchOut(
                room_id=r.room_id,
                room_number=r.room_number,
                building_name=r.building_name,
                floor_number=r.floor_number
            ) for r in rooms
        ]
    }


@app.get(
    "/api/seating/{room_id}/{session_id}",
    response_model=RoomSeatingResponse,
    status_code=status.HTTP_200_OK
)
def get_room_seating_grid(
    room_id: int,
    session_id: int,
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.room_id == room_id).first()
    session = db.query(ExamSession).filter(ExamSession.session_id == session_id).first()

    if not room or not session:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"status": "error", "message": "Specified room or exam session does not exist."}
        )

    # Fetch allocations for this room and session
    allocations = (
        db.query(
            SeatingAllocation.seat_row,
            SeatingAllocation.seat_col,
            Student.student_id,
            Student.register_no,
            Student.full_name,
            Course.course_code
        )
        .join(ExamTimetable, SeatingAllocation.timetable_id == ExamTimetable.timetable_id)
        .join(Student, SeatingAllocation.student_id == Student.student_id)
        .join(Course, ExamTimetable.course_id == Course.course_id)
        .filter(
            SeatingAllocation.room_id == room_id,
            ExamTimetable.session_id == session_id
        )
        .all()
    )

    # Index occupied seats: (row, col) -> record
    occ_map = {(a.seat_row, a.seat_col): a for a in allocations}

    # Construct the physical 5x10 grid with 3-4-3 section labeling
    grid = []
    for r in range(1, 6):
        row_cells = []
        for c in range(1, 11):
            if c <= 3:
                section_label = "Left (3)"
            elif c <= 7:
                section_label = "Middle (4)"
            else:
                section_label = "Right (3)"

            if (r, c) in occ_map:
                alloc = occ_map[(r, c)]
                cell = SeatGridCell(
                    row=r,
                    col=c,
                    section=section_label,
                    status="occupied",
                    student_id=alloc.student_id,
                    register_no=alloc.register_no,
                    full_name=alloc.full_name,
                    course_code=alloc.course_code
                )
            else:
                cell = SeatGridCell(
                    row=r,
                    col=c,
                    section=section_label,
                    status="empty_gap"
                )
            row_cells.append(cell)
        grid.append(row_cells)

    time_str = f"{session.start_time.strftime('%I:%M %p')} - {session.end_time.strftime('%I:%M %p')}"

    return {
        "room_id": room.room_id,
        "room_number": room.room_number,
        "session_id": session.session_id,
        "exam_date": session.exam_date,
        "time_window": time_str,
        "total_assigned": len(allocations),
        "grid": grid
    }



@app.get("/api/students", status_code=status.HTTP_200_OK)
def get_all_students(db: Session = Depends(get_db)):
    # 1. Fetch all students
    students = (
        db.query(Student.student_id, Student.register_no, Student.full_name, Batch.semester_label)
        .join(Batch, Student.batch_id == Batch.batch_id)
        .all()
    )

    # 2. Fetch all current exam allocations
    allocations = (
        db.query(
            SeatingAllocation.student_id,
            ExamTimetable.session_id,
            Course.course_code,
            Room.room_number
        )
        .join(ExamTimetable, SeatingAllocation.timetable_id == ExamTimetable.timetable_id)
        .join(Course, ExamTimetable.course_id == Course.course_id)
        .join(Room, SeatingAllocation.room_id == Room.room_id)
        .all()
    )

    # 3. Map allocations to students
    alloc_map = {}
    for a in allocations:
        if a.student_id not in alloc_map:
            alloc_map[a.student_id] = {}
        alloc_map[a.student_id][f"Slot {a.session_id}"] = f"{a.course_code} ({a.room_number})"

    # 4. Build the final array
    result = []
    for s in students:
        result.append({
            "student_id": s.student_id,
            "register_no": s.register_no,
            "full_name": s.full_name,
            "semester_label": s.semester_label,
            "schedule": alloc_map.get(s.student_id, {})
        })

    return result


@app.get("/api/rooms", status_code=status.HTTP_200_OK)
def get_all_rooms(db: Session = Depends(get_db)):
    # Fetch rooms and their building (Block) names
    rooms = (
        db.query(Room.room_id, Room.room_number, Building.name.label("building_name"))
        .join(Building, Room.building_id == Building.building_id)
        .order_by(Building.name, Room.room_number)
        .all()
    )
    return [
        {"room_id": r.room_id, "room_number": r.room_number, "building_name": r.building_name}
        for r in rooms
    ]


# --- Pydantic Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str


class StudentCreate(BaseModel):
    register_no: str
    full_name: str
    batch_id: int


class StudentUpdate(BaseModel):
    register_no: Optional[str] = None
    full_name: Optional[str] = None
    batch_id: Optional[int] = None


# --- Login Route ---
@app.post("/api/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == form_data.username).first()
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- Protected CRUD Routes ---
@app.post("/api/students", status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreate, db: Session = Depends(get_db),
                   admin: AdminUser = Depends(get_current_admin)):
    db_student = Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


@app.put("/api/students/{student_id}")
def update_student(student_id: int, student_update: StudentUpdate, db: Session = Depends(get_db),
                   admin: AdminUser = Depends(get_current_admin)):
    db_student = db.query(Student).filter(Student.student_id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = student_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)

    db.commit()
    db.refresh(db_student)
    return db_student


@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), admin: AdminUser = Depends(get_current_admin)):
    db_student = db.query(Student).filter(Student.student_id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(db_student)
    db.commit()
    return {"message": f"Student {student_id} successfully removed."}