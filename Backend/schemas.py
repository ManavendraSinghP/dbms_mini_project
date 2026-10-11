from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time


class GenerateTimetableRequest(BaseModel):
    relax_capacity: bool = False


class CourseSummary(BaseModel):
    course_id: int
    course_code: str
    title: str
    is_open_elective: bool

    class Config:
        from_attributes = True


class TimetableSlotResponse(BaseModel):
    session_id: int
    exam_date: date
    start_time: time
    end_time: time
    reporting_time: time
    courses: List[CourseSummary]


class GenerateTimetableResponse(BaseModel):
    status: str
    latency_ms: float
    total_allocations: int
    timetable: List[TimetableSlotResponse]


class StudentSearchOut(BaseModel):
    student_id: int
    register_no: str
    full_name: str
    semester_label: str


class CourseSearchOut(BaseModel):
    course_id: int
    course_code: str
    title: str
    is_open_elective: bool


class RoomSearchOut(BaseModel):
    room_id: int
    room_number: str
    building_name: str
    floor_number: int


class SearchResultsResponse(BaseModel):
    students: List[StudentSearchOut]
    courses: List[CourseSearchOut]
    rooms: List[RoomSearchOut]


class SeatGridCell(BaseModel):
    row: int
    col: int
    section: str  # "Left (3)", "Middle (4)", "Right (3)"
    status: str   # "occupied" or "empty_gap"
    student_id: Optional[int] = None
    register_no: Optional[str] = None
    full_name: Optional[str] = None
    course_code: Optional[str] = None


class RoomSeatingResponse(BaseModel):
    room_id: int
    room_number: str
    session_id: int
    exam_date: date
    time_window: str
    total_assigned: int
    grid: List[List[SeatGridCell]]