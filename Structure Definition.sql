DROP DATABASE IF EXISTS christ_exam_planner;
CREATE DATABASE IF NOT EXISTS christ_exam_planner;
USE christ_exam_planner;

-- 1. Departmentsbatch_coursesbatch_courses
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 2. Programs
CREATE TABLE programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);

-- 3. Batches
CREATE TABLE batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    semester_label VARCHAR(10) UNIQUE NOT NULL, 
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE
);

-- 4. Students
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    register_no VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    batch_id INT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
);

-- 5. Courses
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    is_open_elective BOOLEAN DEFAULT FALSE
);

-- 6. Batch_Courses (Junction for Curriculum & Open Electives)
CREATE TABLE batch_courses (
    batch_id INT,
    course_id INT,
    PRIMARY KEY (batch_id, course_id),
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- 7. Buildings
CREATE TABLE buildings (
    building_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    max_floors INT NOT NULL
);

-- 8. Rooms
CREATE TABLE rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    building_id INT NOT NULL,
    floor_number INT NOT NULL,
    physical_capacity INT DEFAULT 50 CHECK (physical_capacity = 50),
    exam_capacity INT DEFAULT 25 CHECK (exam_capacity = 25),
    FOREIGN KEY (building_id) REFERENCES buildings(building_id) ON DELETE CASCADE,
    CONSTRAINT valid_floor CHECK (floor_number BETWEEN 1 AND 6)
);

-- 9. Exam_Sessions
CREATE TABLE exam_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reporting_time TIME NOT NULL,
    UNIQUE (exam_date, start_time), 
    CONSTRAINT valid_slots CHECK (
        (start_time = '08:30:00' AND end_time = '11:30:00' AND reporting_time = '08:00:00') OR
        (start_time = '12:30:00' AND end_time = '15:30:00' AND reporting_time = '12:00:00')
    )
);

-- 10. Exam_Timetable
CREATE TABLE exam_timetable (
    timetable_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    session_id INT NOT NULL,
    UNIQUE (course_id, session_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(session_id) ON DELETE CASCADE
);

-- 11. Seating_Allocations
CREATE TABLE seating_allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    timetable_id INT NOT NULL,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    seat_row INT CHECK (seat_row BETWEEN 1 AND 5),
    seat_col INT CHECK (seat_col BETWEEN 1 AND 10),
    UNIQUE (timetable_id, student_id), 
    UNIQUE (timetable_id, room_id, seat_row, seat_col),
    FOREIGN KEY (timetable_id) REFERENCES exam_timetable(timetable_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);
