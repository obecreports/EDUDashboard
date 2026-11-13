-- =============================================================================
-- ConED · Scholarship students profile (detail schema)
-- Runtime still uses mock in this phase; seed mirrors mock IDs @ school 1039760340
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.scholarship_students (
  id text PRIMARY KEY,
  student_code text NOT NULL,
  name_prefix text,
  full_name text NOT NULL,
  photo_url text,
  gender text CHECK (gender IN ('ชาย', 'หญิง')),
  grade_level text,
  generation text,
  school_id bigint, -- maps to School_Basic.school_id (soft link; seed works without FK)
  school_name text,
  province text,
  district text,
  scholarship_type text,
  scholarship_year text,
  status text NOT NULL DEFAULT 'กำลังศึกษา'
    CHECK (status IN ('กำลังศึกษา', 'สำเร็จการศึกษา', 'พักการเรียน', 'พ้นสภาพ')),
  terminated_remark_1 text,
  terminated_remark_2 text,
  overseer_level text,
  -- General
  career_goal text,
  birthday date,
  tribe text,
  address text,
  travel_method text,
  personal_id text,
  -- Contact
  can_contact_supervisor boolean DEFAULT false,
  phone text,
  email text,
  facebook text,
  line_id text,
  -- Teacher
  advisor_name text,
  advisor_phone text,
  supervisor_name text,
  supervisor_phone text,
  -- Behavior
  educational_risk text,
  behavioral_risk text,
  risk_information text,
  extra_work text,
  extra_work_frequency text,
  problems_obstacles text,
  -- Family household
  annual_family_income numeric(14,2),
  family_work_assistance text,
  welfare text,
  contactable_guardian text,
  -- Friends
  friend_name_1 text,
  friend_name_2 text,
  -- Health
  health_status text,
  health_details text,
  other_benefits text,
  benefit_period text,
  -- Performance
  average_gpa numeric(4,2),
  job_history text,
  -- Fund
  remaining_budget numeric(14,2),
  disbursed numeric(14,2),
  tuition_fee_disbursed numeric(14,2),
  individual_disbursement numeric(14,2),
  total_scholarship numeric(14,2),
  -- Project
  origin_school text,
  scholarship_origin text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_scholarship_students_school
  ON public.scholarship_students (school_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_students_status
  ON public.scholarship_students (status);
CREATE INDEX IF NOT EXISTS idx_scholarship_students_province
  ON public.scholarship_students (province);

COMMENT ON TABLE public.scholarship_students IS
  'Scholarship student profile (Level 1–3 sensitive fields); UI mock until wired';

CREATE TABLE IF NOT EXISTS public.scholarship_family_members (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES public.scholarship_students (id) ON DELETE CASCADE,
  relationship text NOT NULL,
  full_name text NOT NULL,
  age integer,
  race text,
  nationality text,
  tribe text,
  highest_education text,
  occupation text,
  monthly_income numeric(14,2),
  current_address text,
  national_id text,
  phone text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_scholarship_family_student
  ON public.scholarship_family_members (student_id);

ALTER TABLE public.scholarship_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scholarship_students_read ON public.scholarship_students;
CREATE POLICY scholarship_students_read
  ON public.scholarship_students FOR SELECT USING (true);

DROP POLICY IF EXISTS scholarship_students_write ON public.scholarship_students;
CREATE POLICY scholarship_students_write
  ON public.scholarship_students FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS scholarship_family_read ON public.scholarship_family_members;
CREATE POLICY scholarship_family_read
  ON public.scholarship_family_members FOR SELECT USING (true);

DROP POLICY IF EXISTS scholarship_family_write ON public.scholarship_family_members;
CREATE POLICY scholarship_family_write
  ON public.scholarship_family_members FOR ALL
  USING (true) WITH CHECK (true);

-- Seed aligned with lib/mock/scholarship-students.ts
INSERT INTO public.scholarship_students (
  id, student_code, name_prefix, full_name, gender, grade_level, generation,
  school_id, school_name, province, district, scholarship_type, scholarship_year,
  status, overseer_level, career_goal, birthday, tribe, address, travel_method,
  personal_id, can_contact_supervisor, phone, email, facebook, line_id,
  advisor_name, advisor_phone, supervisor_name, supervisor_phone,
  educational_risk, behavioral_risk, risk_information, extra_work, extra_work_frequency,
  problems_obstacles, annual_family_income, family_work_assistance, welfare,
  contactable_guardian, friend_name_1, friend_name_2, health_status, health_details,
  other_benefits, benefit_period, average_gpa, job_history, remaining_budget, disbursed,
  tuition_fee_disbursed, individual_disbursement, total_scholarship, origin_school,
  scholarship_origin, notes
) VALUES (
  'ss-001', '67012345', 'เด็กชาย', 'ณัฐพล ใจดี', 'ชาย', 'ม.3/1', 'Gen 12',
  1039760340, 'โรงเรียนในโครงการ (1039760340)', 'กาญจนบุรี', 'เมืองกาญจนบุรี',
  'ทุนการศึกษาทั่วไป', '2568', 'กำลังศึกษา', 'อาสาสมัครพื้นที่', 'วิศวกรโยธา',
  '2009-03-15', 'กระเหรี่ยง', '123 หมู่ 4 ต.บ้านเหนือ อ.เมือง จ.กาญจนบุรี 71000',
  'รถโดยสารประจำทาง', '1-7101-00001-01-1', true, '081-000-0001',
  'nattapon.mock@example.com', 'nattapon.jaidee', 'nattapon_j',
  'ครูสมหญิง รักเรียน', '081-111-0001', 'นายวิชัย ดูแลดี', '081-222-0001',
  'ปานกลาง', 'ต่ำ', 'ขาดเรียนเป็นครั้งคราวในฤดูเก็บเกี่ยว', 'ช่วยที่นาครอบครัว',
  'สุดสัปดาห์', 'ระยะทางไกลจากบ้านถึงโรงเรียน', 85000, 'ช่วยเก็บเกี่ยวฤดูกาล',
  'บัตรสวัสดิการแห่งรัฐ', 'นายสมชาย ใจดี', 'สมปอง เพื่อนดี', 'วิภาวี สหายรัก',
  'แข็งแรง', 'ไม่มีโรคประจำตัว', 'ประกันสุขภาพถ้วนหน้า', 'ตลอดปีการศึกษา',
  3.45, 'ช่วยงานร้านค้าชุมชนช่วงปิดเทอม', 12000, 18000, 8000, 10000, 30000,
  'โรงเรียนบ้านดอนมะเกลือ', 'ทุนการศึกษาทั่วไป — คัดเลือกผ่านโครงการ',
  'ข้อมูลจำลองสำหรับทดสอบหน้า นักเรียนทุน'
), (
  'ss-002', '67012346', 'เด็กหญิง', 'พิมพ์ใจ รักเรียน', 'หญิง', 'ม.5/2', 'Gen 10',
  1039760340, 'โรงเรียนในโครงการ (1039760340)', 'กาญจนบุรี', 'เมืองกาญจนบุรี',
  'ทุนพระราชทาน', '2567', 'พ้นสภาพ', 'อาสาสมัครศูนย์', 'พยาบาล',
  '2007-08-22', 'มอญ', '45 หมู่ 2 ต.ปากแพรก อ.เมือง จ.กาญจนบุรี 71000',
  'รถจักรยานยนต์', '1-7101-00004-04-4', false, '081-000-0002',
  'pimjai.mock@example.com', 'pimjai.rakrian', 'pimjai_r',
  'ครูมาลี สอนดี', '081-111-0002', 'นางสาวสุดา ดูแลใกล้', '081-222-0002',
  'ต่ำ', 'ต่ำ', 'ไม่มีประวัติความเสี่ยงสำคัญ', 'ไม่มี', '—',
  'การเดินทางหลังย้ายที่อยู่', 120000, 'ช่วยงานบ้าน', 'ไม่มี',
  'นางสาวมาลี รักเรียน', 'กานดา เพื่อนสนิท', 'นภาพร เพื่อนห้อง',
  'มีโรคภูมิแพ้', 'แพ้ฝุ่นและเกสรดอกไม้', 'ทุนอาหารกลางวัน', 'ปีการศึกษา 2567',
  3.82, 'ฝึกงานห้องพยาบาลโรงเรียน', 0, 35000, 15000, 20000, 35000,
  'โรงเรียนบ้านท่ามะนาว', 'ทุนพระราชทาน', NULL
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.scholarship_students
SET
  terminated_remark_1 = 'ย้ายโรงเรียน',
  terminated_remark_2 = 'ย้ายติดตามผู้ปกครองไปจังหวัดอื่น'
WHERE id = 'ss-002';

INSERT INTO public.scholarship_family_members (
  id, student_id, relationship, full_name, age, race, nationality, tribe,
  highest_education, occupation, monthly_income, current_address, national_id, phone, sort_order
) VALUES
  ('ss-001-f', 'ss-001', 'บิดา', 'นายสมชาย ใจดี', 48, 'ไทย', 'ไทย', 'กระเหรี่ยง',
   'ม.3', 'เกษตรกร', 4500, '123 หมู่ 4 ต.บ้านเหนือ อ.เมือง จ.กาญจนบุรี',
   '1-7101-00002-02-2', '081-000-0011', 1),
  ('ss-001-m', 'ss-001', 'มารดา', 'นางสมศรี ใจดี', 45, 'ไทย', 'ไทย', 'กระเหรี่ยง',
   'ป.6', 'ค้าขาย', 3000, '123 หมู่ 4 ต.บ้านเหนือ อ.เมือง จ.กาญจนบุรี',
   '1-7101-00003-03-3', '081-000-0012', 2),
  ('ss-002-f', 'ss-002', 'บิดา', 'นายประยุทธ์ รักเรียน', 50, 'ไทย', 'ไทย', 'มอญ',
   'ม.6', 'รับจ้างทั่วไป', 6000, '45 หมู่ 2 ต.ปากแพรก อ.เมือง จ.กาญจนบุรี',
   '1-7101-00005-05-5', '081-000-0021', 1),
  ('ss-002-m', 'ss-002', 'มารดา', 'นางสาวมาลี รักเรียน', 47, 'ไทย', 'ไทย', 'มอญ',
   'ปวช.', 'พนักงานร้านค้า', 5500, '45 หมู่ 2 ต.ปากแพรก อ.เมือง จ.กาญจนบุรี',
   '1-7101-00006-06-6', '081-000-0022', 2)
ON CONFLICT (id) DO NOTHING;
