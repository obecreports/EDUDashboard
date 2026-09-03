// =============================================================================
// ConED - School Data Types
// =============================================================================

export type SchoolSize = 'เล็ก' | 'กลาง' | 'ใหญ่' | 'ใหญ่พิเศษ';
export type QualityLevel = 'Developing' | 'Fair' | 'Good' | 'Great' | 'Excellent';
export type BuildingCondition = 'ดีมาก' | 'ดี' | 'พอใช้' | 'ต้องปรับปรุง';

export interface PillarScores {
  learner: number;          // ด้านผู้เรียน
  participation: number;    // ด้านการมีส่วนร่วม
  teacherAdmin: number;     // ด้านผู้สอนและผู้บริหารสถานศึกษา
  curriculum: number;       // ด้านหลักสูตรและการสอน
  infrastructure: number;   // ด้านโครงสร้างพื้นฐาน
}

export interface School {
  school_id: string;
  school_name_th: string;
  school_name_en: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
  phone: string;
  affiliation: string;
  organize_domain: string;
  education_levels: string;
  school_size: SchoolSize;
  director_name: string;
  director_title: string;
  director_phone: string;
  latitude: number;
  longitude: number;
  image_url: string;
  area_id?: number | string;
  area_name?: string;
  Gov_Domain?: { area_id?: any; area_name?: string };
  created_at: string;
  updated_at: string;
}

export interface StudentData {
  school_id: string;
  academic_year: number;
  grade_level: string;
  male_count: number;
  female_count: number;
  total: number;
  classrooms: number;
  disabled_students: number;
  disadvantaged_students: number;
}

export interface PersonnelData {
  school_id: string;
  academic_year: number;
  position_type: string;
  male_count: number;
  female_count: number;
  education_bachelor: number;
  education_master: number;
  education_doctor: number;
  subject_major: string;
}

export interface InfrastructureData {
  school_id: string;
  academic_year: number;
  buildings_count: number;
  buildings_condition: BuildingCondition;
  labs_count: number;
  labs_type: string;
  library_status: boolean;
  library_condition: BuildingCondition;
  sports_facilities: string;
  internet_type: string;
  internet_speed: string;
  computers_count: number;
  water_source: string;
  electricity_status: string;
}

export interface AssessmentData {
  school_id: string;
  academic_year: number;
  quality_level: QualityLevel;
  onet_thai: number;
  onet_math: number;
  onet_english: number;
  onet_science: number;
  average_gpa: number;
  assessment_date: string;
  notes: string;
}

export interface SchoolFull extends School {
  scores?: any;
  students: StudentData[];
  personnel: PersonnelData[];
  infrastructure: InfrastructureData;
  assessment: AssessmentData;
  pillarScores: PillarScores;
  weaknesses: string[];
  studentSummary: {
    totalStudents: number;
    totalMale: number;
    totalFemale: number;
    totalClassrooms: number;
  };
  personnelSummary: {
    totalPersonnel: number;
    totalMale: number;
    totalFemale: number;
  };
  School_Score?: Record<string, number>;
  labelLookup?: Record<string, string>;
  overallScore?: number;
}
