/** Per-category SWOT pair */
export type SwotPair = {
  strengths: string;
  weaknesses: string;
};

export type SchoolSwotInternalKey =
  | 'students'
  | 'management'
  | 'personnel'
  | 'curriculum'
  | 'infrastructure';

export type SchoolSwotExternalKey = 'social' | 'economic' | 'environmental';

/** Granular SWOT — every sub-category has Strengths + Weaknesses */
export type SchoolSwot = {
  internal: Record<SchoolSwotInternalKey, SwotPair>;
  external: Record<SchoolSwotExternalKey, SwotPair>;
};

export const SWOT_INTERNAL_FIELDS: { key: SchoolSwotInternalKey; label: string }[] = [
  { key: 'students', label: 'ผู้เรียน' },
  { key: 'management', label: 'การบริหารจัดการ' },
  { key: 'personnel', label: 'บุคลากร' },
  { key: 'curriculum', label: 'หลักสูตรและการสอน' },
  { key: 'infrastructure', label: 'โครงสร้างพื้นฐาน' },
];

export const SWOT_EXTERNAL_FIELDS: { key: SchoolSwotExternalKey; label: string }[] = [
  { key: 'social', label: 'ด้านสังคม' },
  { key: 'economic', label: 'ด้านเศรษฐกิจ' },
  { key: 'environmental', label: 'ด้านสิ่งแวดล้อม' },
];

function emptyPair(): SwotPair {
  return { strengths: '', weaknesses: '' };
}

export function emptySchoolSwot(): SchoolSwot {
  return {
    internal: {
      students: emptyPair(),
      management: emptyPair(),
      personnel: emptyPair(),
      curriculum: emptyPair(),
      infrastructure: emptyPair(),
    },
    external: {
      social: emptyPair(),
      economic: emptyPair(),
      environmental: emptyPair(),
    },
  };
}

function asPair(v: unknown): SwotPair {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return {
      strengths: String(o.strengths ?? ''),
      weaknesses: String(o.weaknesses ?? ''),
    };
  }
  return emptyPair();
}

/** Normalize cookie/DB payloads (including legacy flat S/W/O/T) into granular SWOT */
export function normalizeSchoolSwot(raw: unknown): SchoolSwot {
  const base = emptySchoolSwot();
  if (!raw || typeof raw !== 'object') return base;
  const row = raw as Record<string, unknown>;

  // New shape
  if (row.internal && typeof row.internal === 'object') {
    const inn = row.internal as Record<string, unknown>;
    for (const f of SWOT_INTERNAL_FIELDS) {
      base.internal[f.key] = asPair(inn[f.key]);
    }
  }
  if (row.external && typeof row.external === 'object') {
    const ext = row.external as Record<string, unknown>;
    for (const f of SWOT_EXTERNAL_FIELDS) {
      base.external[f.key] = asPair(ext[f.key]);
    }
  }

  // Legacy flat columns → park under first internal/external buckets for visibility
  if (typeof row.internal_strengths === 'string' && row.internal_strengths && !base.internal.students.strengths) {
    base.internal.students.strengths = row.internal_strengths;
  }
  if (typeof row.internal_weaknesses === 'string' && row.internal_weaknesses && !base.internal.students.weaknesses) {
    base.internal.students.weaknesses = row.internal_weaknesses;
  }
  if (typeof row.external_opportunities === 'string' && row.external_opportunities && !base.external.social.strengths) {
    base.external.social.strengths = row.external_opportunities;
  }
  if (typeof row.external_threats === 'string' && row.external_threats && !base.external.social.weaknesses) {
    base.external.social.weaknesses = row.external_threats;
  }

  return base;
}

export function swotHasContent(swot: SchoolSwot): boolean {
  const pairs = [
    ...Object.values(swot.internal),
    ...Object.values(swot.external),
  ];
  return pairs.some((p) => p.strengths.trim() || p.weaknesses.trim());
}

/** Flatten for legacy text columns (summary) */
export function flattenSwotLegacy(swot: SchoolSwot): {
  internal_strengths: string;
  internal_weaknesses: string;
  external_opportunities: string;
  external_threats: string;
} {
  const joinInternal = (side: 'strengths' | 'weaknesses') =>
    SWOT_INTERNAL_FIELDS.map((f) => {
      const text = swot.internal[f.key][side].trim();
      return text ? `${f.label}: ${text}` : '';
    })
      .filter(Boolean)
      .join('\n');

  const joinExternal = (side: 'strengths' | 'weaknesses') =>
    SWOT_EXTERNAL_FIELDS.map((f) => {
      const text = swot.external[f.key][side].trim();
      return text ? `${f.label}: ${text}` : '';
    })
      .filter(Boolean)
      .join('\n');

  return {
    internal_strengths: joinInternal('strengths'),
    internal_weaknesses: joinInternal('weaknesses'),
    external_opportunities: joinExternal('strengths'),
    external_threats: joinExternal('weaknesses'),
  };
}
