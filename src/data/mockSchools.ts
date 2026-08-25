// =============================================================================
// ConED - Mock School Data (ข้อมูลจำลองโรงเรียน 18 แห่ง)
// =============================================================================

import type {
  School,
  StudentData,
  PersonnelData,
  InfrastructureData,
  AssessmentData,
  PillarScores,
  SchoolFull,
  SchoolSize,
  QualityLevel,
  BuildingCondition,
} from '../types/school';

// ---------------------------------------------------------------------------
// 1. ข้อมูลพื้นฐานโรงเรียน
// ---------------------------------------------------------------------------
export const schools: School[] = [
  {
    school_id: '1093340267',
    school_name_th: 'โรงเรียนบ้านหนองไผ่',
    school_name_en: 'Ban Nong Phai School',
    address: '123 หมู่ 4',
    subdistrict: 'หนองไผ่',
    district: 'เมือง',
    province: 'ขอนแก่น',
    zipcode: '40000',
    phone: '043-123456',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นายสมชาย ใจดี',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '081-1234567',
    latitude: 16.4419,
    longitude: 102.836,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-15',
  },
  {
    school_id: '1093340268',
    school_name_th: 'โรงเรียนบ้านโนนสวรรค์',
    school_name_en: 'Ban Non Sawan School',
    address: '45 หมู่ 7',
    subdistrict: 'โนนสวรรค์',
    district: 'เมือง',
    province: 'ขอนแก่น',
    zipcode: '40000',
    phone: '043-234567',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นางสมศรี แก้วมณี',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '082-2345678',
    latitude: 16.4321,
    longitude: 102.845,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-10',
  },
  {
    school_id: '1093340269',
    school_name_th: 'โรงเรียนชุมชนบ้านท่าพระ',
    school_name_en: 'Chumchon Ban Tha Phra School',
    address: '89 หมู่ 1',
    subdistrict: 'ท่าพระ',
    district: 'เมือง',
    province: 'ขอนแก่น',
    zipcode: '40260',
    phone: '043-345678',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 1',
    education_levels: 'อนุบาล - มัธยมศึกษาตอนต้น',
    school_size: 'ใหญ่' as SchoolSize,
    director_name: 'นายประเสริฐ ศรีสุข',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '083-3456789',
    latitude: 16.3987,
    longitude: 102.811,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-04-20',
  },
  {
    school_id: '1093340270',
    school_name_th: 'โรงเรียนบ้านหนองแสง',
    school_name_en: 'Ban Nong Saeng School',
    address: '67 หมู่ 3',
    subdistrict: 'หนองแสง',
    district: 'บ้านฝาง',
    province: 'ขอนแก่น',
    zipcode: '40270',
    phone: '043-456789',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 2',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นางวิลาวัลย์ สุขสมบูรณ์',
    director_title: 'รักษาการผู้อำนวยการ',
    director_phone: '084-4567890',
    latitude: 16.5123,
    longitude: 102.789,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-03-25',
  },
  {
    school_id: '1093340271',
    school_name_th: 'โรงเรียนอนุบาลขอนแก่น',
    school_name_en: 'Anubaan Khon Kaen School',
    address: '1 ถ.กลางเมือง',
    subdistrict: 'ในเมือง',
    district: 'เมือง',
    province: 'ขอนแก่น',
    zipcode: '40000',
    phone: '043-567890',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'ใหญ่พิเศษ' as SchoolSize,
    director_name: 'นายวิชัย พงษ์พัฒน์',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '085-5678901',
    latitude: 16.4322,
    longitude: 102.833,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-20',
  },
  {
    school_id: '1093340272',
    school_name_th: 'โรงเรียนบ้านดอนช้าง',
    school_name_en: 'Ban Don Chang School',
    address: '34 หมู่ 5',
    subdistrict: 'ดอนช้าง',
    district: 'เมือง',
    province: 'ขอนแก่น',
    zipcode: '40000',
    phone: '043-678901',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นางสาวนิภา ทองคำ',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '086-6789012',
    latitude: 16.4589,
    longitude: 102.854,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-12',
  },
  {
    school_id: '1093340273',
    school_name_th: 'โรงเรียนบ้านหนองค้อ',
    school_name_en: 'Ban Nong Kho School',
    address: '56 หมู่ 2',
    subdistrict: 'หนองค้อ',
    district: 'น้ำพอง',
    province: 'ขอนแก่น',
    zipcode: '40310',
    phone: '043-789012',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 4',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นายบุญมี มาตรวังแสง',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '087-7890123',
    latitude: 16.7234,
    longitude: 102.901,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-04-30',
  },
  {
    school_id: '1093340274',
    school_name_th: 'โรงเรียนบ้านสำราญ',
    school_name_en: 'Ban Samran School',
    address: '78 หมู่ 6',
    subdistrict: 'สำราญ',
    district: 'เมือง',
    province: 'ขอนแก่น',
    zipcode: '40000',
    phone: '043-890123',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นายสุนทร วงศ์ศรี',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '088-8901234',
    latitude: 16.4678,
    longitude: 102.818,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-05',
  },
  {
    school_id: '1093340275',
    school_name_th: 'โรงเรียนบ้านทุ่งเศรษฐี',
    school_name_en: 'Ban Thung Setthi School',
    address: '90 หมู่ 8',
    subdistrict: 'ทุ่งเศรษฐี',
    district: 'น้ำพอง',
    province: 'ขอนแก่น',
    zipcode: '40310',
    phone: '043-901234',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 4',
    education_levels: 'อนุบาล - มัธยมศึกษาตอนต้น',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นางปราณี จันทร์เพ็ง',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '089-9012345',
    latitude: 16.7456,
    longitude: 102.923,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-04-15',
  },
  {
    school_id: '1093340276',
    school_name_th: 'โรงเรียนบ้านโคกสี',
    school_name_en: 'Ban Khok Si School',
    address: '12 หมู่ 9',
    subdistrict: 'โคกสี',
    district: 'เมือง',
    province: 'ชลบุรี',
    zipcode: '20000',
    phone: '038-012345',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ชลบุรี เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นายอำนาจ พลเสน',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '090-0123456',
    latitude: 13.3611,
    longitude: 100.9847,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-18',
  },
  {
    school_id: '1093340277',
    school_name_th: 'โรงเรียนบ้านศิลา',
    school_name_en: 'Ban Sila School',
    address: '25 หมู่ 10',
    subdistrict: 'ศิลา',
    district: 'เมือง',
    province: 'ชลบุรี',
    zipcode: '20000',
    phone: '038-112233',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ชลบุรี เขต 1',
    education_levels: 'อนุบาล - มัธยมศึกษาตอนต้น',
    school_size: 'ใหญ่' as SchoolSize,
    director_name: 'นางสุดารัตน์ ชัยภูมิ',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '091-1234567',
    latitude: 13.3512,
    longitude: 100.9921,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-08',
  },
  {
    school_id: '1093340278',
    school_name_th: 'โรงเรียนบ้านเลิงเปือย',
    school_name_en: 'Ban Loeng Pueai School',
    address: '38 หมู่ 11',
    subdistrict: 'เลิงเปือย',
    district: 'บ้านฝาง',
    province: 'ขอนแก่น',
    zipcode: '40270',
    phone: '043-223344',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 2',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นายธีรศักดิ์ แสงสว่าง',
    director_title: 'รักษาการผู้อำนวยการ',
    director_phone: '092-2345678',
    latitude: 16.5345,
    longitude: 102.776,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-04-22',
  },
  {
    school_id: '1093340279',
    school_name_th: 'โรงเรียนบ้านม่วงหวาน',
    school_name_en: 'Ban Muang Wan School',
    address: '50 หมู่ 12',
    subdistrict: 'ม่วงหวาน',
    district: 'บางละมุง',
    province: 'ชลบุรี',
    zipcode: '20150',
    phone: '038-334455',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ชลบุรี เขต 3',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นางจินตนา ภูวนาถ',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '093-3456789',
    latitude: 12.9236,
    longitude: 100.8825,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-01',
  },
  {
    school_id: '1093340280',
    school_name_th: 'โรงเรียนพระธาตุขามแก่น',
    school_name_en: 'Phra That Kham Kaen School',
    address: '100 หมู่ 1',
    subdistrict: 'บ้านขาม',
    district: 'น้ำพอง',
    province: 'ขอนแก่น',
    zipcode: '40310',
    phone: '043-445566',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 4',
    education_levels: 'อนุบาล - มัธยมศึกษาตอนต้น',
    school_size: 'ใหญ่' as SchoolSize,
    director_name: 'นายเกรียงไกร ศรีทอง',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '094-4567890',
    latitude: 16.7567,
    longitude: 102.912,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-14',
  },
  {
    school_id: '1093340281',
    school_name_th: 'โรงเรียนบ้านคำแก่นคูณ',
    school_name_en: 'Ban Kham Kaen Khun School',
    address: '63 หมู่ 13',
    subdistrict: 'คำแก่นคูณ',
    district: 'บ้านฝาง',
    province: 'ขอนแก่น',
    zipcode: '40270',
    phone: '043-556677',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 2',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นางสาวพิมพ์ใจ รักษาแก้ว',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '095-5678901',
    latitude: 16.5234,
    longitude: 102.801,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-04-28',
  },
  {
    school_id: '1093340282',
    school_name_th: 'โรงเรียนบ้านโนนท่อน',
    school_name_en: 'Ban Non Thon School',
    address: '77 หมู่ 14',
    subdistrict: 'โนนท่อน',
    district: 'เมือง',
    province: 'ชลบุรี',
    zipcode: '20000',
    phone: '038-667788',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ชลบุรี เขต 1',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นายวรพล ศิริมงคล',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '096-6789012',
    latitude: 13.3622,
    longitude: 100.9756,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-19',
  },
  {
    school_id: '1093340283',
    school_name_th: 'โรงเรียนบ้านหว้าเฒ่า',
    school_name_en: 'Ban Wa Thao School',
    address: '15 หมู่ 15',
    subdistrict: 'หว้าเฒ่า',
    district: 'น้ำพอง',
    province: 'ขอนแก่น',
    zipcode: '40310',
    phone: '043-778899',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ขอนแก่น เขต 4',
    education_levels: 'อนุบาล - ประถมศึกษา',
    school_size: 'เล็ก' as SchoolSize,
    director_name: 'นางลำดวน ชาติวงศ์',
    director_title: 'รักษาการผู้อำนวยการ',
    director_phone: '097-7890123',
    latitude: 16.7345,
    longitude: 102.945,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-03-30',
  },
  {
    school_id: '1093340284',
    school_name_th: 'โรงเรียนบ้านสะอาด',
    school_name_en: 'Ban Sa-at School',
    address: '28 หมู่ 16',
    subdistrict: 'สะอาด',
    district: 'บางละมุง',
    province: 'ชลบุรี',
    zipcode: '20150',
    phone: '038-889900',
    affiliation: 'สพฐ.',
    organize_domain: 'สพป.ชลบุรี เขต 3',
    education_levels: 'อนุบาล - มัธยมศึกษาตอนต้น',
    school_size: 'กลาง' as SchoolSize,
    director_name: 'นายชัยวัฒน์ พานิชย์',
    director_title: 'ผู้อำนวยการโรงเรียน',
    director_phone: '098-8901234',
    latitude: 12.9289,
    longitude: 100.8956,
    image_url: '',
    created_at: '2567-06-01',
    updated_at: '2568-05-16',
  },
];

// ---------------------------------------------------------------------------
// 2. ข้อมูลนักเรียนจำลอง (per school)
// ---------------------------------------------------------------------------
const gradeConfig: Record<string, string[]> = {
  'อนุบาล - ประถมศึกษา': ['อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
  'อนุบาล - มัธยมศึกษาตอนต้น': ['อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'],
};

const sizeMultiplier: Record<SchoolSize, number> = {
  'เล็ก': 1,
  'กลาง': 2,
  'ใหญ่': 3,
  'ใหญ่พิเศษ': 5,
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStudentData(school: School): StudentData[] {
  const grades = gradeConfig[school.education_levels] || gradeConfig['อนุบาล - ประถมศึกษา'];
  const multiplier = sizeMultiplier[school.school_size];
  const rng = seededRandom(parseInt(school.school_id.slice(-4)));

  return grades.map((grade) => {
    const base = grade.startsWith('อนุบาล') ? 8 : 12;
    const male = Math.floor((base + rng() * 10) * multiplier);
    const female = Math.floor((base + rng() * 10) * multiplier);
    return {
      school_id: school.school_id,
      academic_year: 2567,
      grade_level: grade,
      male_count: male,
      female_count: female,
      total: male + female,
      classrooms: Math.max(1, Math.floor((male + female) / 30)),
      disabled_students: Math.floor(rng() * 3),
      disadvantaged_students: Math.floor(rng() * 8 * multiplier),
    };
  });
}

// ---------------------------------------------------------------------------
// 3. ข้อมูลบุคลากรจำลอง (per school)
// ---------------------------------------------------------------------------
const positionTypes = ['ผู้บริหาร', 'ครูผู้สอน', 'ครูอัตราจ้าง', 'บุคลากรสนับสนุน'];

function generatePersonnelData(school: School): PersonnelData[] {
  const multiplier = sizeMultiplier[school.school_size];
  const rng = seededRandom(parseInt(school.school_id.slice(-4)) + 1000);

  return positionTypes.map((pos) => {
    let baseMale = 1, baseFemale = 1;
    switch (pos) {
      case 'ผู้บริหาร':
        baseMale = 1; baseFemale = 0;
        break;
      case 'ครูผู้สอน':
        baseMale = Math.floor(3 * multiplier + rng() * 3);
        baseFemale = Math.floor(4 * multiplier + rng() * 4);
        break;
      case 'ครูอัตราจ้าง':
        baseMale = Math.floor(1 + rng() * 2 * multiplier);
        baseFemale = Math.floor(1 + rng() * 2 * multiplier);
        break;
      case 'บุคลากรสนับสนุน':
        baseMale = Math.floor(1 + rng() * multiplier);
        baseFemale = Math.floor(1 + rng() * multiplier);
        break;
    }
    const total = baseMale + baseFemale;
    return {
      school_id: school.school_id,
      academic_year: 2567,
      position_type: pos,
      male_count: baseMale,
      female_count: baseFemale,
      education_bachelor: Math.floor(total * (0.5 + rng() * 0.3)),
      education_master: Math.floor(total * (0.1 + rng() * 0.3)),
      education_doctor: Math.floor(rng() * 2),
      subject_major: pos === 'ครูผู้สอน' ? 'ทั่วไป' : '-',
    };
  });
}

// ---------------------------------------------------------------------------
// 4. ข้อมูลโครงสร้างพื้นฐาน (per school)
// ---------------------------------------------------------------------------
const conditions: BuildingCondition[] = ['ดีมาก', 'ดี', 'พอใช้', 'ต้องปรับปรุง'];

function generateInfrastructureData(school: School): InfrastructureData {
  const multiplier = sizeMultiplier[school.school_size];
  const rng = seededRandom(parseInt(school.school_id.slice(-4)) + 2000);

  return {
    school_id: school.school_id,
    academic_year: 2567,
    buildings_count: Math.max(1, Math.floor(2 * multiplier + rng() * 3)),
    buildings_condition: conditions[Math.floor(rng() * 3)],
    labs_count: Math.floor(multiplier + rng() * 2),
    labs_type: multiplier >= 3 ? 'วิทยาศาสตร์, คอมพิวเตอร์' : 'คอมพิวเตอร์',
    library_status: true,
    library_condition: conditions[Math.floor(rng() * 3)],
    sports_facilities: multiplier >= 3 ? 'สนามฟุตบอล, สนามบาส, สนามวอลเลย์บอล' : 'สนามอเนกประสงค์',
    internet_type: multiplier >= 2 ? 'ไฟเบอร์ออปติก' : 'ADSL',
    internet_speed: multiplier >= 2 ? '100 Mbps' : '30 Mbps',
    computers_count: Math.floor(10 * multiplier + rng() * 20),
    water_source: 'ประปา',
    electricity_status: 'ปกติ',
  };
}

// ---------------------------------------------------------------------------
// 5. ผลการประเมิน (per school)
// ---------------------------------------------------------------------------
const qualityLevels: QualityLevel[] = ['Developing', 'Fair', 'Good', 'Great', 'Excellent'];

function generateAssessmentData(school: School): AssessmentData {
  const rng = seededRandom(parseInt(school.school_id.slice(-4)) + 3000);
  const sizeIdx = ['เล็ก', 'กลาง', 'ใหญ่', 'ใหญ่พิเศษ'].indexOf(school.school_size);
  const qualityIdx = Math.min(4, Math.max(0, sizeIdx + Math.floor(rng() * 3) - 1));

  return {
    school_id: school.school_id,
    academic_year: 2567,
    quality_level: qualityLevels[qualityIdx],
    onet_thai: Math.round((35 + rng() * 35) * 100) / 100,
    onet_math: Math.round((25 + rng() * 40) * 100) / 100,
    onet_english: Math.round((20 + rng() * 40) * 100) / 100,
    onet_science: Math.round((30 + rng() * 35) * 100) / 100,
    average_gpa: Math.round((2.5 + rng() * 1.5) * 100) / 100,
    assessment_date: '2568-03-15',
    notes: '',
  };
}

// ---------------------------------------------------------------------------
// 6. คะแนน 5 เสาหลัก (Pillar Scores) - สำหรับ Spider Chart
// ---------------------------------------------------------------------------
function generatePillarScores(school: School): PillarScores {
  const rng = seededRandom(parseInt(school.school_id.slice(-4)) + 4000);
  const sizeBonus = sizeMultiplier[school.school_size] * 0.3;

  return {
    learner: Math.round(Math.min(5, (2 + rng() * 2.5 + sizeBonus)) * 10) / 10,
    participation: Math.round(Math.min(5, (1.5 + rng() * 3 + sizeBonus * 0.5)) * 10) / 10,
    teacherAdmin: Math.round(Math.min(5, (2 + rng() * 2 + sizeBonus * 0.8)) * 10) / 10,
    curriculum: Math.round(Math.min(5, (1.8 + rng() * 2.5 + sizeBonus * 0.7)) * 10) / 10,
    infrastructure: Math.round(Math.min(5, (1.5 + rng() * 2 + sizeBonus)) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// 7. จุดที่ต้องพัฒนา (Weaknesses)
// ---------------------------------------------------------------------------
const weaknessPool = [
  'ขาดแคลนครูผู้สอนวิชาเฉพาะทาง (ภาษาอังกฤษ, วิทยาศาสตร์)',
  'ระบบ ICT และอินเทอร์เน็ตไม่เสถียร',
  'อาคารเรียนชำรุดทรุดโทรม ต้องการซ่อมแซม',
  'ขาดงบประมาณสำหรับสื่อการเรียนการสอน',
  'ผลสัมฤทธิ์ทางการเรียนวิชาคณิตศาสตร์ต่ำกว่าเกณฑ์',
  'ผลสัมฤทธิ์ทางการเรียนวิชาภาษาอังกฤษต่ำกว่าเกณฑ์',
  'ขาดห้องปฏิบัติการวิทยาศาสตร์ที่ได้มาตรฐาน',
  'นักเรียนมีปัญหาด้านการอ่านออกเขียนได้',
  'ขาดแหล่งเรียนรู้และห้องสมุดที่ทันสมัย',
  'ต้องการพัฒนาทักษะดิจิทัลของบุคลากร',
  'อัตราส่วนนักเรียนต่อครูสูงเกินเกณฑ์',
  'ขาดอุปกรณ์กีฬาและสนามกีฬาที่เหมาะสม',
  'ต้องการระบบน้ำดื่มสะอาดเพิ่มเติม',
  'ขาดการมีส่วนร่วมจากผู้ปกครองและชุมชน',
];

function generateWeaknesses(school: School): string[] {
  const rng = seededRandom(parseInt(school.school_id.slice(-4)) + 5000);
  const count = 2 + Math.floor(rng() * 3); // 2-4 weaknesses
  const shuffled = [...weaknessPool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

// ---------------------------------------------------------------------------
// 8. รวมข้อมูลทั้งหมด (Full School Data)
// ---------------------------------------------------------------------------
export function getSchoolFull(school: School): SchoolFull {
  const students = generateStudentData(school);
  const personnel = generatePersonnelData(school);
  const infrastructure = generateInfrastructureData(school);
  const assessment = generateAssessmentData(school);
  const pillarScores = generatePillarScores(school);
  const weaknesses = generateWeaknesses(school);

  const studentSummary = {
    totalStudents: students.reduce((sum, s) => sum + s.total, 0),
    totalMale: students.reduce((sum, s) => sum + s.male_count, 0),
    totalFemale: students.reduce((sum, s) => sum + s.female_count, 0),
    totalClassrooms: students.reduce((sum, s) => sum + s.classrooms, 0),
  };

  const personnelSummary = {
    totalPersonnel: personnel.reduce((sum, p) => sum + p.male_count + p.female_count, 0),
    totalMale: personnel.reduce((sum, p) => sum + p.male_count, 0),
    totalFemale: personnel.reduce((sum, p) => sum + p.female_count, 0),
  };

  return {
    ...school,
    students,
    personnel,
    infrastructure,
    assessment,
    pillarScores,
    weaknesses,
    studentSummary,
    personnelSummary,
  };
}

export function getAllSchoolsFull(): SchoolFull[] {
  return schools.map(getSchoolFull);
}

export function getSchoolById(id: string): SchoolFull | undefined {
  const school = schools.find((s) => s.school_id === id);
  if (!school) return undefined;
  return getSchoolFull(school);
}
