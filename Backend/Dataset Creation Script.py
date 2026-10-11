import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker('en_IN')


def generate_mysql():
    sql = ["USE christ_exam_planner;\n"]
    sql.append("START TRANSACTION;\n")

    # 1. Departments
    depts = ['Sciences', 'Social Sciences', 'Arts & Humanities', 'Business & Management', 'Commerce & Finance', 'Law']
    for i, d in enumerate(depts, 1):
        sql.append(f"INSERT INTO departments (department_id, name) VALUES ({i}, '{d}');")

    # 2. Programs
    progs = [
        (1, 'BCA', 'Bachelor of Computer Applications', 1),
        (2, 'BDA', 'Bachelor of Data Analytics', 1),
        (3, 'BBA', 'Bachelor of Business Administration', 4),
        (4, 'BCom', 'Bachelor of Commerce', 5),
        (5, 'BALLB', 'BA LLB Honors', 6)
    ]
    for p in progs:
        sql.append(
            f"INSERT INTO programs (program_id, code, name, department_id) VALUES ({p[0]}, '{p[1]}', '{p[2]}', {p[3]});")

    # 3. Batches (Odd Semesters)
    batch_records = []
    batch_id = 1
    for p_id, p_code, _, _ in progs:
        for sem in [1, 3, 5]:
            batch_label = f"{sem}{p_code}"
            batch_records.append((batch_id, p_id, batch_label))
            sql.append(
                f"INSERT INTO batches (batch_id, program_id, semester_label) VALUES ({batch_id}, {p_id}, '{batch_label}');")
            batch_id += 1

    # 4. Buildings & Rooms
    sql.append("INSERT INTO buildings (building_id, name, max_floors) VALUES (1, 'Block A', 6);")
    sql.append("INSERT INTO buildings (building_id, name, max_floors) VALUES (2, 'Block B', 5);")

    room_id = 1
    for b_id, b_name, floors, room_count in [(1, 'A', 6, 12), (2, 'B', 5, 8)]:
        for i in range(1, room_count + 1):
            floor = (i % floors) + 1 if (i % floors) != 0 else floors
            r_num = f"{b_name}{floor}0{i}"
            sql.append(
                f"INSERT INTO rooms (room_id, room_number, building_id, floor_number) VALUES ({room_id}, '{r_num}', {b_id}, {floor});")
            room_id += 1

    # 5. Courses & Batch_Courses
    course_id = 1
    for i in range(1, 30):
        c_code = f"CORE{100 + i}"
        c_name = fake.catch_phrase().replace("'", "''")
        sql.append(
            f"INSERT INTO courses (course_id, course_code, title, is_open_elective) VALUES ({course_id}, '{c_code}', '{c_name}', FALSE);")
        b_id = random.choice(batch_records)[0]
        sql.append(f"INSERT INTO batch_courses (batch_id, course_id) VALUES ({b_id}, {course_id});")
        course_id += 1

    # Edge Case: Open Elective shared by 3BDA and 3BBA
    sql.append(
        f"INSERT INTO courses (course_id, course_code, title, is_open_elective) VALUES (30, 'OEL300', 'Tech Integration in Business', TRUE);")
    bda_3_id = next(b[0] for b in batch_records if b[2] == '3BDA')
    bba_3_id = next(b[0] for b in batch_records if b[2] == '3BBA')
    sql.append(f"INSERT INTO batch_courses (batch_id, course_id) VALUES ({bda_3_id}, 30);")
    sql.append(f"INSERT INTO batch_courses (batch_id, course_id) VALUES ({bba_3_id}, 30);")

    # 6. Students (500)
    for i in range(1, 501):
        reg_no = f"23{i:04d}"
        name = fake.name().replace("'", "''")
        b_id = random.choice(batch_records)[0]
        sql.append(
            f"INSERT INTO students (student_id, register_no, full_name, batch_id) VALUES ({i}, '{reg_no}', '{name}', {b_id});")

    # 7. Exam Sessions (3 days, 6 slots)
    base_date = datetime.strptime("2026-11-10", "%Y-%m-%d")
    session_id = 1
    for day_offset in range(3):
        exam_date = (base_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")
        sql.append(
            f"INSERT INTO exam_sessions (session_id, exam_date, start_time, end_time, reporting_time) VALUES ({session_id}, '{exam_date}', '08:30:00', '11:30:00', '08:00:00');")
        session_id += 1
        sql.append(
            f"INSERT INTO exam_sessions (session_id, exam_date, start_time, end_time, reporting_time) VALUES ({session_id}, '{exam_date}', '12:30:00', '15:30:00', '12:00:00');")
        session_id += 1

    sql.append("\nCOMMIT;")
    return "\n".join(sql)


if __name__ == "__main__":
    print(generate_mysql())