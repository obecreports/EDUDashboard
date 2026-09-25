export type UserRole = 'global' | 'staff' | 'overseer' | 'admin';

export type SchoolSize = 'เล็ก' | 'กลาง' | 'ใหญ่' | 'ใหญ่พิเศษ';

export interface PillarScores {
  learner: number;
  participation: number;
  teacherAdmin: number;
  curriculum: number;
  infrastructure: number;
}

export interface SchoolFull {
  school_id: string | number;
  school_name_th: string;
  school_name_en?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  moo?: string | number;
  village_name?: string;
  area_id?: string;
  area_name?: string;
  zone?: string;
  zipcode?: string | number;
  phone?: string;
  school_size?: SchoolSize | string;
  latitude?: number | string;
  longitude?: number | string;
  director_name?: string;
  scores?: Record<string, number | string>;
  pillarScores?: PillarScores;
  overallScore?: number;
  studentSummary?: {
    totalStudents: number;
    totalMale?: number;
    totalFemale?: number;
  };
  personnelSummary?: {
    totalPersonnel: number;
  };
  labelLookup?: Record<string, string>;
  School_Score?: Record<string, number | string>;
  School_People?: Record<string, number | string>;
  Gov_Domain?: { area_id?: string; area_name?: string };
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  position: string | null;
  role: UserRole;
  assigned_zone: string | null;
  avatar_url: string | null;
  updated_at?: string;
}

export interface SchoolVisitLog {
  id: number;
  school_id: number;
  staff_id: string;
  visit_date: string;
  survey_status: 'Active' | 'Surveyed' | 'Pending' | 'Inactive';
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
  end?: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  global: 'ผู้เยี่ยมชม (Global)',
  staff: 'เจ้าหน้าที่ (Staff)',
  overseer: 'ผู้กำกับดูแล (Overseer)',
  admin: 'ผู้ดูแลระบบ (Admin)',
};

export const NAV_CATALOG: NavItem[] = [
  { href: '/', label: 'หน้าหลัก', roles: ['global', 'staff', 'overseer', 'admin'], end: true },
  { href: '/schools', label: 'โรงเรียน', roles: ['global', 'staff', 'overseer', 'admin'] },
  { href: '/thailand-map', label: 'แผนที่', roles: ['global', 'staff', 'overseer', 'admin'] },
  { href: '/staff/dashboard', label: 'แดชบอร์ดของฉัน', roles: ['staff'] },
  { href: '/staff/profile', label: 'โปรไฟล์', roles: ['staff'] },
  { href: '/staff/calendar', label: 'ปฏิทิน', roles: ['staff'] },
  { href: '/staff/update-school', label: 'อัปเดตโรงเรียน', roles: ['staff'] },
  { href: '/manage-schools', label: 'จัดการโรงเรียน', roles: ['staff', 'overseer', 'admin'] },
  { href: '/overseer/progress', label: 'ความคืบหน้าเจ้าหน้าที่', roles: ['overseer'] },
  { href: '/admin/settings', label: 'ตั้งค่าเว็บไซต์', roles: ['admin'] },
  { href: '/admin/accounts', label: 'จัดการบัญชี', roles: ['admin'] },
];

export function navForRole(role: UserRole): NavItem[] {
  const seen = new Set<string>();
  return NAV_CATALOG.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

/** Path prefixes → allowed roles (null = public) */
export const PROTECTED_ROUTES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/staff', roles: ['staff'] },
  { prefix: '/overseer', roles: ['overseer'] },
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/manage-schools', roles: ['staff', 'overseer', 'admin'] },
];

export function rolesForPath(pathname: string): UserRole[] | null {
  for (const rule of PROTECTED_ROUTES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.roles;
    }
  }
  return null;
}
