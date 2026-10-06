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
  /** School_Basic.area_special — special area tag */
  area_special?: string | null;
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
    teacherDirector?: number;
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

/** Guest (global) + shared public menus; staff-only items gated by role */
export const NAV_CATALOG: NavItem[] = [
  { href: '/', label: 'หน้าหลัก', roles: ['global', 'staff', 'overseer', 'admin'], end: true },
  { href: '/about', label: 'เกี่ยวกับโครงการ', roles: ['global', 'staff', 'overseer', 'admin'] },
  { href: '/strategy', label: 'ภาพรวม 5 กลยุทธ์', roles: ['global', 'staff', 'overseer', 'admin'] },
  { href: '/thailand-map', label: 'แผนที่', roles: ['global', 'staff', 'overseer', 'admin'] },
  { href: '/schools', label: 'โรงเรียนในความดูแล', roles: ['global', 'staff', 'overseer', 'admin'] },
  /** Staff-only (hidden from guests) */
  { href: '/staff/calendar', label: 'การลงพื้นที่', roles: ['staff'] },
  { href: '/staff/reports', label: 'รายงาน', roles: ['staff'] },
  { href: '/staff/dashboard', label: 'แดชบอร์ดเจ้าหน้าที่', roles: ['staff'] },
  { href: '/staff/update-school', label: 'อัปเดตโรงเรียน', roles: ['staff'] },
  { href: '/manage-schools', label: 'จัดการโรงเรียน', roles: ['staff', 'overseer', 'admin'] },
  { href: '/overseer/progress', label: 'ความคืบหน้าเจ้าหน้าที่', roles: ['overseer'] },
  { href: '/admin/accounts', label: 'จัดการบัญชี', roles: ['admin'] },
];

/** Public banner assets under /public/images/banners/ (~1920×400) */
export const PAGE_BANNERS = {
  about: '/images/banners/banner_about.jpg',
  strategy: '/images/banners/banner_strategy.jpg',
  schools: '/images/banners/banner_schools.jpg',
} as const;

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
  { prefix: '/staff/profile', roles: ['staff', 'overseer', 'admin'] },
  { prefix: '/staff', roles: ['staff'] },
  { prefix: '/overseer', roles: ['overseer'] },
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/manage-schools', roles: ['staff', 'overseer', 'admin'] },
  { prefix: '/change-password', roles: ['global', 'staff', 'overseer', 'admin'] },
];

export function rolesForPath(pathname: string): UserRole[] | null {
  // More specific prefixes first
  const ordered = [...PROTECTED_ROUTES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of ordered) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.roles;
    }
  }
  return null;
}
