/**
 * Thai display date helpers (Buddhist Era / พ.ศ.).
 *
 * IMPORTANT: Use only for UI labels. Storage, comparisons, `<input type="date">`,
 * ISO timestamps, and date math must stay Gregorian / CE (YYYY-MM-DD, Date, toISOString).
 */

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

const THAI_WEEKDAYS = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
] as const;

/** Gregorian year → Buddhist Era (display only). */
export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}

function parseToDate(input: Date | string | number | null | undefined): Date | null {
  if (input == null || input === '') return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(input).trim();
  // Date-only ISO → local noon (avoids TZ day-shift when formatting)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** DD/MM/YYYY with Buddhist Era year (e.g. 14/10/2569). */
export function formatThaiDate(input: Date | string | number | null | undefined): string {
  const d = parseToDate(input);
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${toBuddhistYear(d.getFullYear())}`;
}

/** DD/MM/YYYY HH:mm (Buddhist Era). */
export function formatThaiDateTime(input: Date | string | number | null | undefined): string {
  const d = parseToDate(input);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatThaiDate(d)} ${hh}:${min}`;
}

/** HH:mm local time. */
export function formatThaiTime(input: Date | string | number | null | undefined): string {
  const d = parseToDate(input);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

/** e.g. วันจันทร์ 14/10/2569 */
export function formatThaiDateWithWeekday(
  input: Date | string | number | null | undefined
): string {
  const d = parseToDate(input);
  if (!d) return '—';
  return `วัน${THAI_WEEKDAYS[d.getDay()]} ${formatThaiDate(d)}`;
}

/** Calendar month header: "มกราคม 2569" (BE). */
export function formatThaiMonthYear(input: Date | string | number | null | undefined): string {
  const d = parseToDate(input);
  if (!d) return '—';
  return `${THAI_MONTHS[d.getMonth()]} ${toBuddhistYear(d.getFullYear())}`;
}

/** Month name only (0–11). */
export function formatThaiMonthName(monthIndex: number): string {
  return THAI_MONTHS[monthIndex] ?? '';
}

/** YYYY-MM → "มกราคม 2569" */
export function formatThaiYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym || '—';
  return formatThaiMonthYear(new Date(y, m - 1, 1));
}

/** e.g. 28 สิงหาคม 2504 (Buddhist Era, Thai month name) */
export function formatThaiBirthDateLong(
  input: Date | string | number | null | undefined
): string {
  const d = parseToDate(input);
  if (!d) return '—';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${toBuddhistYear(d.getFullYear())}`;
}

/**
 * Parse Excel / UI birth like `28-สิงหาคม-2504` or `28 สิงหาคม 2504` → YYYY-MM-DD (CE).
 */
export function parseThaiBirthDateToYmd(input: string): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const m = raw.match(
    /^(\d{1,2})[-\s/]+([ก-๙A-Za-z.]+)[-\s/]+(\d{4})$/u
  );
  if (!m) {
    // fallback DD/MM/YYYY
    return parseThaiDateToYmd(raw);
  }
  const dd = Number(m[1]);
  const monthRaw = m[2]!.trim();
  let yyyy = Number(m[3]);
  if (yyyy >= 2400) yyyy -= 543;
  const monthIndex = THAI_MONTHS.findIndex(
    (name) => name === monthRaw || name.startsWith(monthRaw)
  );
  if (monthIndex < 0 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2200) {
    return null;
  }
  const d = new Date(yyyy, monthIndex, dd);
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== monthIndex ||
    d.getDate() !== dd
  ) {
    return null;
  }
  return `${yyyy}-${String(monthIndex + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Parse UI date DD/MM/YYYY (Buddhist or Christian year) → YYYY-MM-DD (CE).
 * Years ≥ 2400 are treated as Buddhist Era and converted (−543).
 */
export function parseThaiDateToYmd(input: string): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (yyyy >= 2400) yyyy -= 543;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2200) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
