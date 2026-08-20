INSERT INTO faculty (id, name, email, password_hash)
VALUES
  (1, 'Dr. Meera Sharma', 'faculty@college.edu', '$2a$10$sFDS613IttHoDQ0k8UB4WuqwZHkLtUg4qoh46zTcfRsw.EAiUtbCe'),
  (2, 'Prof. Arjun Verma', 'faculty2@college.edu', '$2a$10$sFDS613IttHoDQ0k8UB4WuqwZHkLtUg4qoh46zTcfRsw.EAiUtbCe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, name, section, semester)
VALUES
  (1, 'B.Tech CSE', 'A', 5),
  (2, 'B.Tech CSE', 'B', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, class_id, name, email, roll_number, password_hash)
VALUES
  (1, 1, 'Aarav Singh', 'student1@college.edu', 'CSE5A01', '$2a$10$ooGQMKrQCAu3oKuekd0R0OHp/68QdeFOkBCFKRUMykHck/ZKEd67C'),
  (2, 1, 'Diya Patel', 'student2@college.edu', 'CSE5A02', '$2a$10$ooGQMKrQCAu3oKuekd0R0OHp/68QdeFOkBCFKRUMykHck/ZKEd67C'),
  (3, 1, 'Ishaan Gupta', 'student3@college.edu', 'CSE5A03', '$2a$10$ooGQMKrQCAu3oKuekd0R0OHp/68QdeFOkBCFKRUMykHck/ZKEd67C'),
  (4, 2, 'Sara Khan', 'student4@college.edu', 'CSE5B01', '$2a$10$ooGQMKrQCAu3oKuekd0R0OHp/68QdeFOkBCFKRUMykHck/ZKEd67C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, class_id, faculty_id, name, code)
VALUES
  (1, 1, 1, 'Database Management Systems', 'DBMS'),
  (2, 1, 1, 'Operating Systems', 'OS'),
  (3, 2, 2, 'Computer Networks', 'CN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO attendance (student_id, faculty_id, subject_id, date, status)
VALUES
  (1, 1, 1, '2026-03-01', 'present'),
  (2, 1, 1, '2026-03-01', 'present'),
  (3, 1, 1, '2026-03-01', 'absent'),
  (1, 1, 2, '2026-03-02', 'present'),
  (2, 1, 2, '2026-03-02', 'absent'),
  (3, 1, 2, '2026-03-02', 'present')
ON CONFLICT (student_id, subject_id, date) DO NOTHING;
