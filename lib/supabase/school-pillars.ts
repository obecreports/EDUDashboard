import { createAnonClient } from '@/lib/supabase/anon';
import type { ThreePillarScores } from '@/lib/types';
import { THREE_PILLAR_INDICATOR_DEFS, type ThreePillarKey } from '@/lib/mock/pillars';

export type SchoolPillarScoreRow = {
  school_id: number | string;
  i_1_1?: number | null;
  i_1_2?: number | null;
  i_1_3?: number | null;
  i_2_1?: number | null;
  i_2_2?: number | null;
  i_2_3?: number | null;
  i_2_4?: number | null;
  i_2_5?: number | null;
  i_2_6?: number | null;
  i_3_1?: number | null;
  i_3_2?: number | null;
  pillar_1?: number | null;
  pillar_2?: number | null;
  pillar_3?: number | null;
  overall?: number | null;
  school_year?: string | null;
};

export const EMPTY_THREE_PILLAR: ThreePillarScores = {
  qualitySchool: 0,
  qualityGraduation: 0,
  disciplineMorality: 0,
  overall: 0,
};

function num(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Map DB row → ThreePillarScores (0–100). Missing pillars fall back to indicator averages. */
export function mapPillarRow(row: SchoolPillarScoreRow | null | undefined): ThreePillarScores {
  if (!row) return { ...EMPTY_THREE_PILLAR };

  const qualitySchool =
    num(row.pillar_1) || avg([num(row.i_1_1), num(row.i_1_2), num(row.i_1_3)].filter((n) => n > 0));
  const qualityGraduation =
    num(row.pillar_2) ||
    avg(
      [num(row.i_2_1), num(row.i_2_2), num(row.i_2_3), num(row.i_2_4), num(row.i_2_5), num(row.i_2_6)].filter(
        (n) => n > 0
      )
    );
  const disciplineMorality =
    num(row.pillar_3) || avg([num(row.i_3_1), num(row.i_3_2)].filter((n) => n > 0));
  const overall =
    num(row.overall) ||
    (qualitySchool || qualityGraduation || disciplineMorality
      ? Math.round(((qualitySchool + qualityGraduation + disciplineMorality) / 3) * 10) / 10
      : 0);

  return { qualitySchool, qualityGraduation, disciplineMorality, overall };
}

/** school_pillar_scores column → indicator code */
export const PILLAR_COLUMN_MAP: Record<
  ThreePillarKey,
  { pillarCol: keyof SchoolPillarScoreRow; indicators: { code: string; column: keyof SchoolPillarScoreRow; fallback: string }[] }
> = {
  qualitySchool: {
    pillarCol: 'pillar_1',
    indicators: [
      { code: '1.1', column: 'i_1_1', fallback: THREE_PILLAR_INDICATOR_DEFS.qualitySchool[0]!.label },
      { code: '1.2', column: 'i_1_2', fallback: THREE_PILLAR_INDICATOR_DEFS.qualitySchool[1]!.label },
      { code: '1.3', column: 'i_1_3', fallback: THREE_PILLAR_INDICATOR_DEFS.qualitySchool[2]!.label },
    ],
  },
  qualityGraduation: {
    pillarCol: 'pillar_2',
    indicators: [
      { code: '2.1', column: 'i_2_1', fallback: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation[0]!.label },
      { code: '2.2', column: 'i_2_2', fallback: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation[1]!.label },
      { code: '2.3', column: 'i_2_3', fallback: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation[2]!.label },
      { code: '2.4', column: 'i_2_4', fallback: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation[3]!.label },
      { code: '2.5', column: 'i_2_5', fallback: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation[4]!.label },
      { code: '2.6', column: 'i_2_6', fallback: THREE_PILLAR_INDICATOR_DEFS.qualityGraduation[5]!.label },
    ],
  },
  disciplineMorality: {
    pillarCol: 'pillar_3',
    indicators: [
      { code: '3.1', column: 'i_3_1', fallback: THREE_PILLAR_INDICATOR_DEFS.disciplineMorality[0]!.label },
      { code: '3.2', column: 'i_3_2', fallback: THREE_PILLAR_INDICATOR_DEFS.disciplineMorality[1]!.label },
    ],
  },
};

/** Resolve Label_Lookup name for a school_pillar_scores column / indicator code */
export function labelFromLookup(
  lookup: Record<string, string> | undefined,
  column: string,
  code: string,
  fallback: string
): string {
  if (!lookup) return fallback;
  const candidates = [
    column,
    column.toUpperCase(),
    column.toLowerCase(),
    code,
    code.replace('.', '_'),
    code.replace('.', ''),
    `P${code}`,
    `p${code}`,
    `I_${code.replace('.', '_')}`,
    `i_${code.replace('.', '_')}`,
  ];
  for (const key of candidates) {
    const name = lookup[key]?.trim();
    if (name) return name;
  }
  return fallback;
}

export function indicatorScoresFromRow(
  row: SchoolPillarScoreRow | null | undefined,
  lookup?: Record<string, string>
): Record<
  ThreePillarKey,
  { code: string; column: string; label: string; score: number }[]
> {
  const r: Partial<SchoolPillarScoreRow> = row ?? {};
  const keys = Object.keys(PILLAR_COLUMN_MAP) as ThreePillarKey[];
  const out = {} as Record<
    ThreePillarKey,
    { code: string; column: string; label: string; score: number }[]
  >;
  for (const key of keys) {
    out[key] = PILLAR_COLUMN_MAP[key].indicators.map((ind) => ({
      code: ind.code,
      column: String(ind.column),
      label: labelFromLookup(lookup, String(ind.column), ind.code, ind.fallback),
      score: num(r[ind.column]),
    }));
  }
  return out;
}

/** Fetch all school_pillar_scores rows (anon). Returns empty map if table missing / unreachable. */
export async function fetchAllPillarScores(): Promise<Map<string, SchoolPillarScoreRow>> {
  const out = new Map<string, SchoolPillarScoreRow>();
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.from('school_pillar_scores').select('*');
    if (error || !data) return out;
    for (const row of data as SchoolPillarScoreRow[]) {
      if (row.school_id == null) continue;
      out.set(String(row.school_id), row);
    }
  } catch {
    /* table may not exist yet */
  }
  return out;
}

export async function fetchPillarScoreBySchoolId(
  schoolId: string | number
): Promise<SchoolPillarScoreRow | null> {
  try {
    const supabase = createAnonClient();
    const id = Number(schoolId);
    const { data, error } = await supabase
      .from('school_pillar_scores')
      .select('*')
      .eq('school_id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as SchoolPillarScoreRow;
  } catch {
    return null;
  }
}
