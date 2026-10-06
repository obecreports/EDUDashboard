/** Development status tiers matching mockup badges */

export type DevStatusKey = 'urgent' | 'accelerate' | 'progressing' | 'strong';

export type DevStatusMeta = {
  key: DevStatusKey;
  label: string;
  color: string;
  bg: string;
  border: string;
};

export const DEV_STATUS: Record<DevStatusKey, DevStatusMeta> = {
  urgent: {
    key: 'urgent',
    label: 'ต้องติดตามใกล้ชิด',
    color: '#B91C1C',
    bg: '#FEE2E2',
    border: '#FECACA',
  },
  accelerate: {
    key: 'accelerate',
    label: 'ควรเร่งพัฒนา',
    color: '#C2410C',
    bg: '#FFEDD5',
    border: '#FED7AA',
  },
  progressing: {
    key: 'progressing',
    label: 'พัฒนาได้',
    color: '#A16207',
    bg: '#FEF9C3',
    border: '#FDE047',
  },
  strong: {
    key: 'strong',
    label: 'เข้มแข็ง',
    color: '#15803D',
    bg: '#DCFCE7',
    border: '#86EFAC',
  },
};

/** Map overall score (0–5) → development status */
export function statusFromScore(score: number | undefined | null): DevStatusMeta {
  const s = score ?? 0;
  if (s < 2.5) return DEV_STATUS.urgent;
  if (s < 3.2) return DEV_STATUS.accelerate;
  if (s < 4) return DEV_STATUS.progressing;
  return DEV_STATUS.strong;
}

export const STRATEGY_LABELS = [
  { key: 'learner', short: 'S', label: 'ด้านผู้เรียน', color: '#EF4444' },
  { key: 'participation', short: 'M', label: 'ด้านการมีส่วนร่วม', color: '#22C55E' },
  { key: 'teacherAdmin', short: 'H', label: 'ด้านครูและผู้บริหาร', color: '#F97316' },
  { key: 'curriculum', short: 'C', label: 'ด้านหลักสูตร', color: '#A855F7' },
  { key: 'infrastructure', short: 'D', label: 'ด้านโครงสร้างพื้นฐาน', color: '#0B4DA2' },
] as const;
