/**
 * Score data years — always Christian Era (A.D.) in DB + app constants.
 * Convert to Buddhist Era only for UI labels.
 *
 * DB / constants: '2025', '2026', …
 * Display (BE):   '2568', '2569', …  (= CE + 543)
 */

/** Live score year stored in DB (A.D.). */
export const SCORE_YEAR_CURRENT = '2026';

/** Prior year for YoY charts when rows exist (A.D.). */
export const SCORE_YEAR_PREVIOUS = '2025';

/** Normalize any stored year to CE string. Accepts CE or legacy BE (>2400). */
export function normalizeScoreYearCe(
  year: string | number | null | undefined
): string | null {
  const raw = String(year ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Legacy Buddhist Era values accidentally stored (e.g. 2568)
  if (n >= 2400) return String(n - 543);
  return String(Math.trunc(n));
}

/** CE year string → Buddhist Era label for UI. */
export function scoreYearToBeLabel(ce: string | number | null | undefined): string {
  const normalized = normalizeScoreYearCe(ce) ?? SCORE_YEAR_CURRENT;
  const n = Number(normalized);
  return String(n + 543);
}

/** @deprecated use scoreYearToBeLabel — kept alias for clarity at call sites */
export function scoreYearLabel(ce: string | number | null | undefined): string {
  return scoreYearToBeLabel(ce);
}

/**
 * Exact year match only (CE or legacy BE equivalent). No fallback.
 * Use for YoY previous-year series so missing years stay empty.
 */
export function pickScoreRowExactYear<T extends { school_year?: string | null }>(
  rows: T[],
  year: string
): T | null {
  if (!rows.length) return null;
  const preferred = normalizeScoreYearCe(year);
  if (!preferred) return null;
  return rows.find((r) => normalizeScoreYearCe(r.school_year) === preferred) ?? null;
}

/**
 * Pick one score row for a school given preferred CE year.
 * Prefer exact year (CE or legacy BE equivalent) → null/empty → highest CE year.
 */
export function pickScoreRowForYear<T extends { school_year?: string | null }>(
  rows: T[],
  preferredYear: string = SCORE_YEAR_CURRENT
): T | null {
  if (!rows.length) return null;
  const preferred = normalizeScoreYearCe(preferredYear) ?? SCORE_YEAR_CURRENT;

  const exact = pickScoreRowExactYear(rows, preferred);
  if (exact) return exact;

  const legacy = rows.find((r) => !String(r.school_year ?? '').trim());
  if (legacy) return legacy;

  const sorted = [...rows].sort((a, b) => {
    const ay = Number(normalizeScoreYearCe(a.school_year) ?? 0);
    const by = Number(normalizeScoreYearCe(b.school_year) ?? 0);
    return by - ay;
  });
  return sorted[0] ?? null;
}
