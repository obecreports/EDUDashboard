import { MOCK_DIRECTOR_SCHOOL_ID } from '@/lib/auth/mock-users';

export type ContractTeacher = {
  id: string;
  full_name: string;
  name_prefix?: string;
  gender: 'ชาย' | 'หญิง';
  position: string;
  subject?: string;
  school_id: string;
  school_name: string;
  province: string;
  district: string;
  contract_type: string;
  start_date: string;
  end_date?: string | null;
  status: 'ปฏิบัติงาน' | 'สิ้นสุดสัญญา' | 'ลาออก';
  phone?: string;
  notes?: string;
};

/** Mock contract teachers — replace with DB later (2 rows @ school 1039760340) */
export const MOCK_CONTRACT_TEACHERS: ContractTeacher[] = [
  {
    id: 'ct-001',
    name_prefix: 'นาย',
    full_name: 'สมหมาย สอนดี',
    gender: 'ชาย',
    position: 'ครูอัตราจ้าง',
    subject: 'คณิตศาสตร์',
    school_id: MOCK_DIRECTOR_SCHOOL_ID,
    school_name: 'โรงเรียนในโครงการ (1039760340)',
    province: 'กาญจนบุรี',
    district: 'เมืองกาญจนบุรี',
    contract_type: 'อัตราจ้างรายปี',
    start_date: '2025-05-01',
    end_date: '2026-04-30',
    status: 'ปฏิบัติงาน',
    phone: '082-111-0001',
    notes: 'ข้อมูลจำลองสำหรับทดสอบหน้า ครูอัตราจ้าง',
  },
  {
    id: 'ct-002',
    name_prefix: 'นางสาว',
    full_name: 'อรทัย ใจงาม',
    gender: 'หญิง',
    position: 'ครูอัตราจ้าง',
    subject: 'ภาษาอังกฤษ',
    school_id: MOCK_DIRECTOR_SCHOOL_ID,
    school_name: 'โรงเรียนในโครงการ (1039760340)',
    province: 'กาญจนบุรี',
    district: 'เมืองกาญจนบุรี',
    contract_type: 'อัตราจ้างรายปี',
    start_date: '2024-05-01',
    end_date: '2025-04-30',
    status: 'สิ้นสุดสัญญา',
    phone: '082-111-0002',
  },
];

export function listContractTeachers(): ContractTeacher[] {
  return [...MOCK_CONTRACT_TEACHERS];
}

export function getContractTeacher(id: string): ContractTeacher | undefined {
  return MOCK_CONTRACT_TEACHERS.find((t) => t.id === id);
}

export function contractTeachersBySchool(
  schoolId: string | number
): ContractTeacher[] {
  const id = String(schoolId);
  return MOCK_CONTRACT_TEACHERS.filter((t) => t.school_id === id);
}
