import { MOCK_DIRECTOR_SCHOOL_ID } from '@/lib/auth/mock-users';

export type ScholarshipStudentStatus =
  | 'กำลังศึกษา'
  | 'สำเร็จการศึกษา'
  | 'พักการเรียน'
  | 'พ้นสภาพ';

export type TerminatedRemark1 =
  | 'ลาออก'
  | 'ย้ายโรงเรียน'
  | 'หมดสิทธิ์ทุน';

export type ScholarshipFamilyMember = {
  id: string;
  relationship: string;
  full_name: string;
  age?: number;
  race?: string;
  nationality?: string;
  tribe?: string;
  highest_education?: string;
  occupation?: string;
  monthly_income?: number;
  current_address?: string;
  national_id?: string;
  phone?: string;
};

export type ScholarshipStudent = {
  id: string;
  /** Display / list code (รหัสนักเรียน) */
  student_code: string;
  full_name: string;
  name_prefix?: string;
  photo_url?: string | null;
  gender: 'ชาย' | 'หญิง';
  grade_level: string;
  generation?: string;
  school_id: string;
  school_name: string;
  province: string;
  district: string;
  /** List column — usually same as scholarship_origin */
  scholarship_type: string;
  scholarship_year?: string;
  status: ScholarshipStudentStatus;
  terminated_remark_1?: TerminatedRemark1 | null;
  terminated_remark_2?: string | null;
  overseer_level?: string;
  // General
  career_goal?: string;
  birthday?: string;
  tribe?: string;
  address?: string;
  travel_method?: string;
  personal_id?: string;
  // Contact
  can_contact_supervisor?: boolean;
  phone?: string;
  email?: string;
  facebook?: string;
  line_id?: string;
  // Teacher
  advisor_name?: string;
  advisor_phone?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  // Behavior
  educational_risk?: string;
  behavioral_risk?: string;
  risk_information?: string;
  extra_work?: string;
  extra_work_frequency?: string;
  problems_obstacles?: string;
  // Family household
  annual_family_income?: number;
  family_work_assistance?: string;
  welfare?: string;
  contactable_guardian?: string;
  family_members: ScholarshipFamilyMember[];
  // Friends
  friend_name_1?: string;
  friend_name_2?: string;
  // Health
  health_status?: string;
  health_details?: string;
  other_benefits?: string;
  benefit_period?: string;
  // Performance
  average_gpa?: number;
  /** @deprecated use average_gpa */
  gpa?: number;
  job_history?: string;
  // Fund
  remaining_budget?: number;
  disbursed?: number;
  tuition_fee_disbursed?: number;
  individual_disbursement?: number;
  total_scholarship?: number;
  // Project
  origin_school?: string;
  scholarship_origin?: string;
  notes?: string;
};

export const DEFAULT_SCHOLARSHIP_PHOTO = '/images/avatar_default.svg';

/** Mock scholarship students — replace with DB later (rows @ school 1039760340) */
export const MOCK_SCHOLARSHIP_STUDENTS: ScholarshipStudent[] = [
  {
    id: 'ss-001',
    student_code: '67012345',
    name_prefix: 'เด็กชาย',
    full_name: 'ณัฐพล ใจดี',
    photo_url: null,
    gender: 'ชาย',
    grade_level: 'ม.3/1',
    generation: 'Gen 12',
    school_id: MOCK_DIRECTOR_SCHOOL_ID,
    school_name: 'โรงเรียนในโครงการ (1039760340)',
    province: 'กาญจนบุรี',
    district: 'เมืองกาญจนบุรี',
    scholarship_type: 'ทุนการศึกษาทั่วไป',
    scholarship_year: '2568',
    status: 'กำลังศึกษา',
    overseer_level: 'อาสาสมัครพื้นที่',
    career_goal: 'วิศวกรโยธา',
    birthday: '2552-03-15',
    tribe: 'กระเหรี่ยง',
    address: '123 หมู่ 4 ต.บ้านเหนือ อ.เมือง จ.กาญจนบุรี 71000',
    travel_method: 'รถโดยสารประจำทาง',
    personal_id: '1-7101-00001-01-1',
    can_contact_supervisor: true,
    phone: '081-000-0001',
    email: 'nattapon.mock@example.com',
    facebook: 'nattapon.jaidee',
    line_id: 'nattapon_j',
    advisor_name: 'ครูสมหญิง รักเรียน',
    advisor_phone: '081-111-0001',
    supervisor_name: 'นายวิชัย ดูแลดี',
    supervisor_phone: '081-222-0001',
    educational_risk: 'ปานกลาง',
    behavioral_risk: 'ต่ำ',
    risk_information: 'ขาดเรียนเป็นครั้งคราวในฤดูเก็บเกี่ยว',
    extra_work: 'ช่วยที่นาครอบครัว',
    extra_work_frequency: 'สุดสัปดาห์',
    problems_obstacles: 'ระยะทางไกลจากบ้านถึงโรงเรียน',
    annual_family_income: 85000,
    family_work_assistance: 'ช่วยเก็บเกี่ยวฤดูกาล',
    welfare: 'บัตรสวัสดิการแห่งรัฐ',
    contactable_guardian: 'นายสมชาย ใจดี',
    family_members: [
      {
        id: 'ss-001-f',
        relationship: 'บิดา',
        full_name: 'นายสมชาย ใจดี',
        age: 48,
        race: 'ไทย',
        nationality: 'ไทย',
        tribe: 'กระเหรี่ยง',
        highest_education: 'ม.3',
        occupation: 'เกษตรกร',
        monthly_income: 4500,
        current_address: '123 หมู่ 4 ต.บ้านเหนือ อ.เมือง จ.กาญจนบุรี',
        national_id: '1-7101-00002-02-2',
        phone: '081-000-0011',
      },
      {
        id: 'ss-001-m',
        relationship: 'มารดา',
        full_name: 'นางสมศรี ใจดี',
        age: 45,
        race: 'ไทย',
        nationality: 'ไทย',
        tribe: 'กระเหรี่ยง',
        highest_education: 'ป.6',
        occupation: 'ค้าขาย',
        monthly_income: 3000,
        current_address: '123 หมู่ 4 ต.บ้านเหนือ อ.เมือง จ.กาญจนบุรี',
        national_id: '1-7101-00003-03-3',
        phone: '081-000-0012',
      },
    ],
    friend_name_1: 'สมปอง เพื่อนดี',
    friend_name_2: 'วิภาวี สหายรัก',
    health_status: 'แข็งแรง',
    health_details: 'ไม่มีโรคประจำตัว',
    other_benefits: 'ประกันสุขภาพถ้วนหน้า',
    benefit_period: 'ตลอดปีการศึกษา',
    average_gpa: 3.45,
    gpa: 3.45,
    job_history: 'ช่วยงานร้านค้าชุมชนช่วงปิดเทอม',
    remaining_budget: 12000,
    disbursed: 18000,
    tuition_fee_disbursed: 8000,
    individual_disbursement: 10000,
    total_scholarship: 30000,
    origin_school: 'โรงเรียนบ้านดอนมะเกลือ',
    scholarship_origin: 'ทุนการศึกษาทั่วไป — คัดเลือกผ่านโครงการ',
    notes: 'ข้อมูลจำลองสำหรับทดสอบหน้า นักเรียนทุน',
  },
  {
    id: 'ss-002',
    student_code: '67012346',
    name_prefix: 'เด็กหญิง',
    full_name: 'พิมพ์ใจ รักเรียน',
    photo_url: null,
    gender: 'หญิง',
    grade_level: 'ม.5/2',
    generation: 'Gen 10',
    school_id: MOCK_DIRECTOR_SCHOOL_ID,
    school_name: 'โรงเรียนในโครงการ (1039760340)',
    province: 'กาญจนบุรี',
    district: 'เมืองกาญจนบุรี',
    scholarship_type: 'ทุนพระราชทาน',
    scholarship_year: '2567',
    status: 'พ้นสภาพ',
    terminated_remark_1: 'ย้ายโรงเรียน',
    terminated_remark_2: 'ย้ายติดตามผู้ปกครองไปจังหวัดอื่น',
    overseer_level: 'อาสาสมัครศูนย์',
    career_goal: 'พยาบาล',
    birthday: '2550-08-22',
    tribe: 'มอญ',
    address: '45 หมู่ 2 ต.ปากแพรก อ.เมือง จ.กาญจนบุรี 71000',
    travel_method: 'รถจักรยานยนต์',
    personal_id: '1-7101-00004-04-4',
    can_contact_supervisor: false,
    phone: '081-000-0002',
    email: 'pimjai.mock@example.com',
    facebook: 'pimjai.rakrian',
    line_id: 'pimjai_r',
    advisor_name: 'ครูมาลี สอนดี',
    advisor_phone: '081-111-0002',
    supervisor_name: 'นางสาวสุดา ดูแลใกล้',
    supervisor_phone: '081-222-0002',
    educational_risk: 'ต่ำ',
    behavioral_risk: 'ต่ำ',
    risk_information: 'ไม่มีประวัติความเสี่ยงสำคัญ',
    extra_work: 'ไม่มี',
    extra_work_frequency: '—',
    problems_obstacles: 'การเดินทางหลังย้ายที่อยู่',
    annual_family_income: 120000,
    family_work_assistance: 'ช่วยงานบ้าน',
    welfare: 'ไม่มี',
    contactable_guardian: 'นางสาวมาลี รักเรียน',
    family_members: [
      {
        id: 'ss-002-f',
        relationship: 'บิดา',
        full_name: 'นายประยุทธ์ รักเรียน',
        age: 50,
        race: 'ไทย',
        nationality: 'ไทย',
        tribe: 'มอญ',
        highest_education: 'ม.6',
        occupation: 'รับจ้างทั่วไป',
        monthly_income: 6000,
        current_address: '45 หมู่ 2 ต.ปากแพรก อ.เมือง จ.กาญจนบุรี',
        national_id: '1-7101-00005-05-5',
        phone: '081-000-0021',
      },
      {
        id: 'ss-002-m',
        relationship: 'มารดา',
        full_name: 'นางสาวมาลี รักเรียน',
        age: 47,
        race: 'ไทย',
        nationality: 'ไทย',
        tribe: 'มอญ',
        highest_education: 'ปวช.',
        occupation: 'พนักงานร้านค้า',
        monthly_income: 5500,
        current_address: '45 หมู่ 2 ต.ปากแพรก อ.เมือง จ.กาญจนบุรี',
        national_id: '1-7101-00006-06-6',
        phone: '081-000-0022',
      },
    ],
    friend_name_1: 'กานดา เพื่อนสนิท',
    friend_name_2: 'นภาพร เพื่อนห้อง',
    health_status: 'มีโรคภูมิแพ้',
    health_details: 'แพ้ฝุ่นและเกสรดอกไม้',
    other_benefits: 'ทุนอาหารกลางวัน',
    benefit_period: 'ปีการศึกษา 2567',
    average_gpa: 3.82,
    gpa: 3.82,
    job_history: 'ฝึกงานห้องพยาบาลโรงเรียน',
    remaining_budget: 0,
    disbursed: 35000,
    tuition_fee_disbursed: 15000,
    individual_disbursement: 20000,
    total_scholarship: 35000,
    origin_school: 'โรงเรียนบ้านท่ามะนาว',
    scholarship_origin: 'ทุนพระราชทาน',
  },
];

export function listScholarshipStudents(): ScholarshipStudent[] {
  return [...MOCK_SCHOLARSHIP_STUDENTS];
}

export function getScholarshipStudent(
  id: string
): ScholarshipStudent | undefined {
  return MOCK_SCHOLARSHIP_STUDENTS.find((s) => s.id === id);
}

export function scholarshipStudentsBySchool(
  schoolId: string | number
): ScholarshipStudent[] {
  const id = String(schoolId);
  return MOCK_SCHOLARSHIP_STUDENTS.filter((s) => s.school_id === id);
}
