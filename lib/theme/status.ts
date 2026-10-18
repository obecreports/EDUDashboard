/** Development status tiers — 5 score bands for school measurement */

export type DevStatusKey = 'develop' | 'fair' | 'good' | 'veryGood' | 'excellent';

export type DevStatusMeta = {
  key: DevStatusKey;
  label: string;
  /** Exact brand accent (charts / text / icon) */
  color: string;
  /** Pastel card fill */
  bg: string;
  border: string;
};

export const DEV_STATUS_ORDER: DevStatusKey[] = [
  'develop',
  'fair',
  'good',
  'veryGood',
  'excellent',
];

/**
 * Rank accents / pastel fills (CSS --rank-1…5 / --rank-*-bg):
 * 1 #E55B8C · 2 #EDC93D · 3 #8FD05A · 4 #20B8AE · 5 #2F6FDE
 */
export const DEV_STATUS: Record<DevStatusKey, DevStatusMeta> = {
  develop: {
    key: 'develop',
    label: 'ควรพัฒนา',
    color: '#E55B8C',
    bg: '#FDECF2',
    border: '#F5C4D4',
  },
  fair: {
    key: 'fair',
    label: 'พอใช้',
    color: '#EDC93D',
    bg: '#FFF8D8',
    border: '#F5E8A0',
  },
  good: {
    key: 'good',
    label: 'ดี',
    color: '#8FD05A',
    bg: '#F0FAE7',
    border: '#CDEBB0',
  },
  veryGood: {
    key: 'veryGood',
    label: 'ดีมาก',
    color: '#20B8AE',
    bg: '#E8FBF8',
    border: '#B0E8E2',
  },
  excellent: {
    key: 'excellent',
    label: 'ยอดเยี่ยม',
    color: '#2F6FDE',
    bg: '#EDF4FF',
    border: '#B8CFEF',
  },
};

/** Legacy query/deep-link keys from the previous 4-tier scale */
const LEGACY_STATUS_MAP: Record<string, DevStatusKey> = {
  urgent: 'develop',
  accelerate: 'fair',
  progressing: 'good',
  strong: 'excellent',
};

export function parseDevStatusKey(raw: string | null | undefined): DevStatusKey | null {
  if (!raw) return null;
  if (raw in DEV_STATUS) return raw as DevStatusKey;
  return LEGACY_STATUS_MAP[raw] ?? null;
}

/**
 * Map overall score (0–5 strategy or 0–100 pillars) → 5 measurement bands.
 * Aligns with scorePastelLevel thresholds.
 */
export function statusFromScore(score: number | undefined | null): DevStatusMeta {
  const raw = score ?? 0;
  // Normalize 0–100 pillar scores onto the 0–5 scale used by thresholds
  const s = raw > 5 ? raw / 20 : raw;
  if (s < 1) return DEV_STATUS.develop;
  if (s < 2) return DEV_STATUS.fair;
  if (s < 3) return DEV_STATUS.good;
  if (s < 4) return DEV_STATUS.veryGood;
  return DEV_STATUS.excellent;
}

/** 5 bands for school card backgrounds (0–5 or 0–100). */
export type ScorePastelLevel = 0 | 1 | 2 | 3 | 4;

export function scorePastelLevel(score: number | undefined | null): ScorePastelLevel {
  const raw = score ?? 0;
  const s = raw > 5 ? raw / 20 : raw;
  if (s < 1) return 0;
  if (s < 2) return 1;
  if (s < 3) return 2;
  if (s < 4) return 3;
  return 4;
}

export const STRATEGY_LABELS = [
  { key: 'learner', short: 'S', label: 'ด้านผู้เรียน', color: '#EF4444' },
  { key: 'participation', short: 'M', label: 'ด้านการมีส่วนร่วม', color: '#22C55E' },
  { key: 'teacherAdmin', short: 'H', label: 'ด้านครูและผู้บริหาร', color: '#F97316' },
  { key: 'curriculum', short: 'C', label: 'ด้านหลักสูตร', color: '#A855F7' },
  { key: 'infrastructure', short: 'D', label: 'ด้านโครงสร้างพื้นฐาน', color: '#0B4DA2' },
] as const;
