import type { ThreePillarScores } from '@/lib/types';
import {
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
  scoreYearToBeLabel,
} from '@/lib/scores/years';

export const THREE_PILLAR_LABELS = {
  qualitySchool: 'เสาหลักที่ 1 ให้เด็กได้เรียนในโรงเรียนที่มีคุณภาพ',
  qualityGraduation: 'เสาหลักที่ 2 ให้เด็กสำเร็จการศึกษาอย่างมีคุณภาพ',
  disciplineMorality: 'เสาหลักที่ 3 ปลูกฝังวินัย คุณธรรม-จริยธรรม',
} as const;

export type ThreePillarKey = keyof typeof THREE_PILLAR_LABELS;

export type PillarIndicatorDef = {
  code: string;
  label: string;
};

export const THREE_PILLAR_INDICATOR_DEFS: Record<ThreePillarKey, PillarIndicatorDef[]> = {
  qualitySchool: [
    { code: '1.1', label: 'ศักยภาพครูในการดูแลและพัฒนาผู้เรียนรายบุคคล' },
    { code: '1.2', label: 'ความพร้อมด้านอาคาร ห้องเรียน และโครงสร้างพื้นฐาน' },
    { code: '1.3', label: 'ความพร้อมด้านสื่อ เทคโนโลยี และระบบสารสนเทศ' },
  ],
  qualityGraduation: [
    { code: '2.1', label: 'ผลสัมฤทธิ์ทางการเรียน' },
    { code: '2.2', label: 'ทักษะแห่งอนาคตและทักษะดิจิทัล' },
    { code: '2.3', label: 'คุณภาพกระบวนการจัดการเรียนรู้ของครูและโรงเรียน' },
    { code: '2.4', label: 'เจตคติต่อการเรียนรู้' },
    { code: '2.5', label: 'สุขภาพและพัฒนาการสมวัย' },
    { code: '2.6', label: 'การค้นพบความถนัด อาชีพ และแนวทางศึกษาต่อ' },
  ],
  disciplineMorality: [
    { code: '3.1', label: 'คุณลักษณะอันพึงประสงค์และความรับผิดชอบต่อความยั่งยืน' },
    { code: '3.2', label: 'กระบวนการเสริมสร้างคุณธรรมและจริยธรรม' },
  ],
};

/** Empty indicator scores (no mock values) — filled from school_pillar_scores when available */
export const EMPTY_PILLAR_INDICATORS: Record<
  ThreePillarKey,
  { code: string; label: string; score: number }[]
> = {
  qualitySchool: THREE_PILLAR_INDICATOR_DEFS.qualitySchool.map((d) => ({ ...d, score: 0 })),
  qualityGraduation: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation.map((d) => ({
    ...d,
    score: 0,
  })),
  disciplineMorality: THREE_PILLAR_INDICATOR_DEFS.disciplineMorality.map((d) => ({
    ...d,
    score: 0,
  })),
};

export const EMPTY_PILLAR_OVERVIEW = {
  qualitySchool: 0,
  qualityGraduation: 0,
  disciplineMorality: 0,
  overall: 0,
  yearCompare: {
    prev: { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0, overall: 0 },
    curr: { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0, overall: 0 },
    /** Buddhist Era labels for UI (DB stores CE via SCORE_YEAR_*) */
    prevLabel: scoreYearToBeLabel(SCORE_YEAR_PREVIOUS),
    currLabel: scoreYearToBeLabel(SCORE_YEAR_CURRENT),
  },
  strengths: [] as string[],
  opportunities: [] as string[],
};

export function emptyThreePillarScores(): ThreePillarScores {
  return { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0, overall: 0 };
}
