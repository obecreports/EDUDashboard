/**
 * SWOT — long-text blocks (4 DB columns)
 * 1 สภาพแวดล้อมภายใน
 *   1.1 จุดแข็ง (Strengths)  → internal_strengths
 *   1.2 จุดอ่อน (Weaknesses) → internal_weaknesses
 * 2 สภาพแวดล้อมภายนอก
 *   2.1 จุดแข็ง (Strengths)  → external_strengths
 *   2.2 อุปสรรค (Threats)   → external_threats
 */
export type SchoolSwot = {
  internal: {
    strengths: string;
    weaknesses: string;
  };
  external: {
    strengths: string;
    threats: string;
  };
};

/** @deprecated kept for gradual migration of old granular keys */
export type SwotPair = {
  strengths: string;
  weaknesses: string;
};

/** @deprecated */
export type SchoolSwotInternalKey =
  | 'students'
  | 'management'
  | 'personnel'
  | 'curriculum'
  | 'infrastructure';

/** @deprecated */
export type SchoolSwotExternalKey = 'social' | 'economic' | 'environmental';

export const SWOT_SECTIONS = [
  {
    group: 'สภาพแวดล้อมภายใน',
    items: [
      { key: 'internal.strengths' as const, code: '1.1', label: 'จุดแข็ง (Strengths)' },
      { key: 'internal.weaknesses' as const, code: '1.2', label: 'จุดอ่อน (Weaknesses)' },
    ],
  },
  {
    group: 'สภาพแวดล้อมภายนอก',
    items: [
      { key: 'external.strengths' as const, code: '2.1', label: 'จุดแข็ง (Strengths)' },
      { key: 'external.threats' as const, code: '2.2', label: 'อุปสรรค (Threats)' },
    ],
  },
] as const;

export function emptySchoolSwot(): SchoolSwot {
  return {
    internal: { strengths: '', weaknesses: '' },
    external: { strengths: '', threats: '' },
  };
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function joinCategoryPairs(
  obj: Record<string, unknown> | undefined,
  side: 'strengths' | 'weaknesses'
): string {
  if (!obj) return '';
  const parts: string[] = [];
  for (const [label, raw] of Object.entries(obj)) {
    if (!raw || typeof raw !== 'object') continue;
    const text = asText((raw as Record<string, unknown>)[side]).trim();
    if (text) parts.push(`${label}: ${text}`);
  }
  return parts.join('\n\n');
}

/** Normalize cookie/DB payloads (including legacy column names) */
export function normalizeSchoolSwot(raw: unknown): SchoolSwot {
  const base = emptySchoolSwot();
  if (!raw || typeof raw !== 'object') return base;
  const row = raw as Record<string, unknown>;

  // Nested app shape
  if (row.internal && typeof row.internal === 'object') {
    const inn = row.internal as Record<string, unknown>;
    if (typeof inn.strengths === 'string' || typeof inn.weaknesses === 'string') {
      base.internal.strengths = asText(inn.strengths);
      base.internal.weaknesses = asText(inn.weaknesses);
    } else {
      base.internal.strengths = joinCategoryPairs(inn, 'strengths');
      base.internal.weaknesses = joinCategoryPairs(inn, 'weaknesses');
    }
  }
  if (row.external && typeof row.external === 'object') {
    const ext = row.external as Record<string, unknown>;
    if (typeof ext.strengths === 'string' || typeof ext.threats === 'string') {
      base.external.strengths = asText(ext.strengths);
      base.external.threats = asText(ext.threats);
    } else if (typeof ext.weaknesses === 'string') {
      base.external.strengths = asText(ext.strengths);
      base.external.threats = asText(ext.weaknesses);
    } else {
      base.external.strengths = joinCategoryPairs(ext, 'strengths');
      base.external.threats = joinCategoryPairs(ext, 'weaknesses');
    }
  }

  // Canonical DB columns (long text)
  if (row.internal_strengths) base.internal.strengths = asText(row.internal_strengths);
  if (row.internal_weaknesses) base.internal.weaknesses = asText(row.internal_weaknesses);
  if (row.external_strengths) base.external.strengths = asText(row.external_strengths);
  if (row.external_threats) base.external.threats = asText(row.external_threats);

  // Legacy names (pre-006)
  if (!base.external.strengths && typeof row.external_opportunities === 'string') {
    base.external.strengths = row.external_opportunities;
  }
  if (!base.internal.strengths && row.internal_strengths_text) {
    base.internal.strengths = asText(row.internal_strengths_text);
  }
  if (!base.internal.weaknesses && row.internal_weaknesses_text) {
    base.internal.weaknesses = asText(row.internal_weaknesses_text);
  }
  if (!base.external.strengths && row.external_strengths_text) {
    base.external.strengths = asText(row.external_strengths_text);
  }
  if (!base.external.threats && row.external_threats_text) {
    base.external.threats = asText(row.external_threats_text);
  }

  return base;
}

export function swotHasContent(swot: SchoolSwot): boolean {
  return Boolean(
    swot.internal.strengths.trim() ||
      swot.internal.weaknesses.trim() ||
      swot.external.strengths.trim() ||
      swot.external.threats.trim()
  );
}

/** Flatten to the 4 canonical DB long-text columns */
export function flattenSwotForDb(swot: SchoolSwot): {
  internal_strengths: string;
  internal_weaknesses: string;
  external_strengths: string;
  external_threats: string;
} {
  return {
    internal_strengths: swot.internal.strengths,
    internal_weaknesses: swot.internal.weaknesses,
    external_strengths: swot.external.strengths,
    external_threats: swot.external.threats,
  };
}

/** @deprecated — use flattenSwotForDb */
export function flattenSwotLegacy(swot: SchoolSwot) {
  const row = flattenSwotForDb(swot);
  return {
    ...row,
    external_opportunities: row.external_strengths,
  };
}

/** @deprecated — empty stubs so old imports compile during migration */
export const SWOT_INTERNAL_FIELDS: { key: SchoolSwotInternalKey; label: string }[] = [];
export const SWOT_EXTERNAL_FIELDS: { key: SchoolSwotExternalKey; label: string }[] = [];
