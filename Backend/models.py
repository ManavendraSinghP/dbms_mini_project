from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Time, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class Department(Base):
    __tablename__ = "departments"

    department_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)

    programs = relationship("Program", back_populates="department", cascade="all, delete-orphan")


class Program(Base):
    __tablename__ = "programs"

    program_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), unique=True, nullable=False)  # BCA, BDA, BBA
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.department_id", ondelete="CASCADE"), nullable=False)

    department = relationship("Department", back_populates="programs")
    batches = relationship("Batch", back_populates="program", cascade="all, delete-orphan")


class Batch(Base):
    __tablename__ = "batches"

    batch_id = Column(Integer, primary_key=True, autoincrement=True)
    program_id = Column(Integer, ForeignKey("programs.program_id", ondelete="CASCADE"), nullable=False)
    semester_label = Column(String(10), unique=True, nullable=False)  # 1BDA, 3BDA, 5BDA

    program = relationship("Program", back_populates="batches")
    students = relationship("Student", back_populates="batch", cascade="all, delete-orphan")
    courses = relationship("Course", secondary="batch_courses", back_populates="batches")


class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, autoincrement=True)
    register_no = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), nullable=False)

    batch = relationship("Batch", back_populates="students")
    allocations = relationship("SeatingAllocation", back_populates="student", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, autoincrement=True)
    course_code = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(150), nullable=False, index=True)
    is_open_elective = Column(Boolean, default=False, nullable=False)

    batches = relationship("Batch", secondary="batch_courses", back_populates="courses")
    timetable_entries = relationship("ExamTimetable", back_populates="course", cascade="all, delete-orphan")


class BatchCourse(Base):
    __tablename__ = "batch_courses"

    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), primary_key=True)


class Building(Base):
    __tablename__ = "buildings"

    building_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)  # Block A, Block B
    max_floors = Column(Integer, nullable=False)

    rooms = relationship("Room", back_populates="building", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(Integer, primary_key=True, autoincrement=True)
    room_number = Column(String(10), unique=True, nullable=False, index=True)
    building_id = Column(Integer, ForeignKey("buildings.building_id", ondelete="CASCADE"), nullable=False)
    floor_number = Column(Integer, nullable=False)
    physical_capacity = Column(Integer, default=50, nullable=False)
    exam_capacity = Column(Integer, default=25, nullable=False)

    __table_args__ = (
        CheckConstraint("physical_capacity = 50", name="chk_physical_cap"),
        CheckConstraint("exam_capacity = 25", name="chk_exam_cap"),
        CheckConstraint("floor_number BETWEEN 1 AND 6", name="chk_valid_floor"),
    )

    building = relationship("Building", back_populates="rooms")
    allocations = relationship("SeatingAllocation", back_populates="room", cascade="all, delete-orphan")


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    reporting_time = Column(Time, nullable=False)

    __table_args__ = (
        UniqueConstraint("exam_date", "start_time", name="uq_session_date_time"),
    )

    timetable_entries = relationship("ExamTimetable", back_populates="session", cascade="all, delete-orphan")


class ExamTimetable(Base):
    __tablename__ = "exam_timetable"

    timetable_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("exam_sessions.session_id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "session_id", name="uq_course_session"),
    )

    course = relationship("Course", back_populates="timetable_entries")
    session = relationship("ExamSession", back_populates="timetable_entries")
    allocations = relationship("SeatingAllocation", back_populates="timetable", cascade="all, delete-orphan")


class SeatingAllocation(Base):
    __tablename__ = "seating_allocations"

    allocation_id = Column(Integer, primary_key=True, autoincrement=True)
    timetable_id = Column(Integer, ForeignKey("exam_timetable.timetable_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id", ondelete="CASCADE"), nullable=False)
    seat_row = Column(Integer, nullable=False)
    seat_col = Column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint("seat_row BETWEEN 1 AND 5", name="chk_seat_row"),
        CheckConstraint("seat_col BETWEEN 1 AND 10", name="chk_seat_col"),
        UniqueConstraint("timetable_id", "student_id", name="uq_student_exam"),
        UniqueConstraint("timetable_id", "room_id", "seat_row", "seat_col", name="uq_physical_seat"),
    )

    timetable = relationship("ExamTimetable", back_populates="allocations")
    student = relationship("Student", back_populates="allocations")
    room = relationship("Room", back_populates="allocations")


from sqlalchemy import Column, Integer, String
# Ensure Base is imported from your database.py

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)