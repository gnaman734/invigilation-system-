-- Instructors
INSERT INTO public.instructors (id, name, email, department)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Aarav Sharma', 'aarav.sharma@univ.edu', 'Computer Science'),
  ('22222222-2222-2222-2222-222222222222', 'Neha Verma', 'neha.verma@univ.edu', 'Mathematics'),
  ('33333333-3333-3333-3333-333333333333', 'Rohan Iyer', 'rohan.iyer@univ.edu', 'Physics'),
  ('44444444-4444-4444-4444-444444444444', 'Priya Nair', 'priya.nair@univ.edu', 'Chemistry'),
  ('55555555-5555-5555-5555-555555555555', 'Karan Mehta', 'karan.mehta@univ.edu', 'Electronics')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  department = EXCLUDED.department;

-- Exams
INSERT INTO public.exams (id, subject, exam_date, start_time, end_time)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Data Structures', '2026-04-10', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Engineering Mathematics', '2026-04-12', '10:00', '13:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Digital Electronics', '2026-04-14', '14:00', '17:00')
ON CONFLICT (id) DO UPDATE SET
  subject = EXCLUDED.subject,
  exam_date = EXCLUDED.exam_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

-- Rooms
INSERT INTO public.rooms (id, room_number, building, capacity)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'A-101', 'Main Block', 40),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'A-102', 'Main Block', 35),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'B-201', 'Science Wing', 50),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'C-303', 'Tech Tower', 45)
ON CONFLICT (id) DO UPDATE SET
  room_number = EXCLUDED.room_number,
  building = EXCLUDED.building,
  capacity = EXCLUDED.capacity;

-- Duties
INSERT INTO public.duties (
  id,
  exam_id,
  room_id,
  instructor_id,
  reporting_time,
  arrival_time,
  status
)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111', '08:30', '08:25', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', '08:30', '08:42', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '33333333-3333-3333-3333-333333333333', '08:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '44444444-4444-4444-4444-444444444444', '09:30', '09:28', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '55555555-5555-5555-5555-555555555555', '09:30', '09:41', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '11111111-1111-1111-1111-111111111111', '13:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', '13:30', '13:25', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '33333333-3333-3333-3333-333333333333', '13:30', '13:38', 'late')
ON CONFLICT (id) DO UPDATE SET
  exam_id = EXCLUDED.exam_id,
  room_id = EXCLUDED.room_id,
  instructor_id = EXCLUDED.instructor_id,
  reporting_time = EXCLUDED.reporting_time,
  arrival_time = EXCLUDED.arrival_time,
  status = EXCLUDED.status;
