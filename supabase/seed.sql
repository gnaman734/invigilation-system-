-- Instructors
INSERT INTO public.instructors (id, name, email, department, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Aarav Sharma', 'aarav.sharma@univ.edu', 'Computer Science', 'approved'),
  ('22222222-2222-2222-2222-222222222222', 'Neha Verma', 'neha.verma@univ.edu', 'Mathematics', 'approved'),
  ('33333333-3333-3333-3333-333333333333', 'Rohan Iyer', 'rohan.iyer@univ.edu', 'Physics', 'approved'),
  ('44444444-4444-4444-4444-444444444444', 'Priya Nair', 'priya.nair@univ.edu', 'Chemistry', 'approved'),
  ('55555555-5555-5555-5555-555555555555', 'Karan Mehta', 'karan.mehta@univ.edu', 'Electronics', 'approved'),
  ('66666666-6666-6666-6666-666666666666', 'Sanya Kapoor', 'sanya.kapoor@univ.edu', 'Mechanical', 'approved'),
  ('77777777-7777-7777-7777-777777777777', 'Ishaan Gupta', 'ishaan.gupta@univ.edu', 'Civil', 'approved'),
  ('88888888-8888-8888-8888-888888888888', 'Meera Joshi', 'meera.joshi@univ.edu', 'Biotechnology', 'approved'),
  ('99999999-9999-9999-9999-999999999999', 'Aditya Rao', 'aditya.rao@univ.edu', 'Information Technology', 'approved'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Nidhi Bansal', 'nidhi.bansal@univ.edu', 'Electrical', 'approved')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  department = EXCLUDED.department,
  status = EXCLUDED.status;

-- Exams
INSERT INTO public.exams (id, subject, exam_date, start_time, end_time)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Data Structures', '2026-04-10', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Engineering Mathematics', '2026-04-12', '10:00', '13:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Digital Electronics', '2026-04-14', '14:00', '17:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'Operating Systems', '2025-11-18', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'Signals and Systems', '2025-12-09', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'Database Systems', '2026-01-13', '10:00', '13:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7', 'Thermodynamics', '2026-02-03', '10:00', '13:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8', 'Linear Algebra', '2026-03-03', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9', 'Machine Learning', '2026-03-24', '14:00', '17:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'Compiler Design', '2026-01-20', '14:00', '17:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'Control Systems', '2026-01-27', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', 'Probability', '2026-02-10', '09:00', '12:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae', 'Materials Science', '2026-02-17', '14:00', '17:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf', 'Network Security', '2026-02-24', '10:00', '13:00'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa10', 'Artificial Intelligence', '2026-03-10', '10:00', '13:00')
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
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '33333333-3333-3333-3333-333333333333', '13:30', '13:38', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '66666666-6666-6666-6666-666666666666', '08:30', '08:27', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccca', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '77777777-7777-7777-7777-777777777777', '09:30', '09:36', 'late'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '88888888-8888-8888-8888-888888888888', '09:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '99999999-9999-9999-9999-999999999999', '13:30', '13:22', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '08:30', '08:45', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccce', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '11111111-1111-1111-1111-111111111111', '09:30', '09:26', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccf', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '22222222-2222-2222-2222-222222222222', '13:30', '13:44', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd0', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '33333333-3333-3333-3333-333333333333', '09:30', '09:29', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '44444444-4444-4444-4444-444444444444', '08:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '55555555-5555-5555-5555-555555555555', '13:30', '13:31', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '66666666-6666-6666-6666-666666666666', '08:30', '08:24', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '77777777-7777-7777-7777-777777777777', '13:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '88888888-8888-8888-8888-888888888888', '08:30', '08:39', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '99999999-9999-9999-9999-999999999999', '09:30', '09:27', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '13:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111', '08:30', '08:26', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccd9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', '08:30', '08:41', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccda', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '33333333-3333-3333-3333-333333333333', '09:30', '09:28', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccdb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '44444444-4444-4444-4444-444444444444', '09:30', '09:37', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccdc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '55555555-5555-5555-5555-555555555555', '08:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccdd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '66666666-6666-6666-6666-666666666666', '13:30', '13:24', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccde', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '77777777-7777-7777-7777-777777777777', '13:30', '13:39', 'late'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccdf', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '88888888-8888-8888-8888-888888888888', '08:30', '08:27', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-cccccccccce0', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '99999999-9999-9999-9999-999999999999', '08:30', '08:43', 'late'),
  ('cccccccc-cccc-cccc-cccc-cccccccccce1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '13:30', '13:23', 'on-time'),
  ('cccccccc-cccc-cccc-cccc-cccccccccce2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '11111111-1111-1111-1111-111111111111', '09:30', NULL, 'pending'),
  ('cccccccc-cccc-cccc-cccc-cccccccccce3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa10', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '22222222-2222-2222-2222-222222222222', '09:30', '09:26', 'on-time')
ON CONFLICT (id) DO UPDATE SET
  exam_id = EXCLUDED.exam_id,
  room_id = EXCLUDED.room_id,
  instructor_id = EXCLUDED.instructor_id,
  reporting_time = EXCLUDED.reporting_time,
  arrival_time = EXCLUDED.arrival_time,
  status = EXCLUDED.status;

-- Analytics cache (derived from duties)
INSERT INTO public.analytics_cache (instructor_id, total_duties, late_count, on_time_count, updated_at)
SELECT
  i.id AS instructor_id,
  COALESCE(d.total_duties, 0) AS total_duties,
  COALESCE(d.late_count, 0) AS late_count,
  COALESCE(d.on_time_count, 0) AS on_time_count,
  now() AS updated_at
FROM public.instructors i
LEFT JOIN (
  SELECT
    instructor_id,
    COUNT(*)::int AS total_duties,
    COUNT(*) FILTER (WHERE status = 'late')::int AS late_count,
    COUNT(*) FILTER (WHERE status = 'on-time')::int AS on_time_count
  FROM public.duties
  GROUP BY instructor_id
) d ON d.instructor_id = i.id
ON CONFLICT (instructor_id) DO UPDATE SET
  total_duties = EXCLUDED.total_duties,
  late_count = EXCLUDED.late_count,
  on_time_count = EXCLUDED.on_time_count,
  updated_at = now();

-- Sync denormalized instructor counters with analytics cache
UPDATE public.instructors i
SET
  total_duties = ac.total_duties,
  late_arrivals = ac.late_count,
  on_time_arrivals = ac.on_time_count
FROM public.analytics_cache ac
WHERE ac.instructor_id = i.id;
