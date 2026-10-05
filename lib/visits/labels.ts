/** Shared visit activity / status labels (safe for client + server) */

export const VISIT_ACTIVITIES = [
  'เยี่ยมชมโรงเรียน',
  'สำรวจข้อมูล',
  'ติดตามผล',
  'ประชุม',
] as const;

export type VisitActivityType = (typeof VISIT_ACTIVITIES)[number];

export const VISIT_STATUSES = ['นัดหมายแล้ว', 'เยี่ยมชมเสร็จสิ้น', 'ยกเลิก'] as const;
export type VisitStatusThai = (typeof VISIT_STATUSES)[number];

/** Map legacy English cookies → Thai labels */
export function normalizeActivity(raw: string): string {
  const map: Record<string, string> = {
    'Site Visit': 'เยี่ยมชมโรงเรียน',
    Survey: 'สำรวจข้อมูล',
    'Follow-up': 'ติดตามผล',
    Meeting: 'ประชุม',
  };
  return map[raw] ?? raw;
}

export function normalizeStatus(raw: string | undefined | null): VisitStatusThai {
  if (raw === 'completed' || raw === 'เยี่ยมชมเสร็จสิ้น') return 'เยี่ยมชมเสร็จสิ้น';
  if (raw === 'ยกเลิก') return 'ยกเลิก';
  return 'นัดหมายแล้ว';
}

export function statusToLegacy(status: VisitStatusThai): 'scheduled' | 'completed' {
  return status === 'เยี่ยมชมเสร็จสิ้น' ? 'completed' : 'scheduled';
}
