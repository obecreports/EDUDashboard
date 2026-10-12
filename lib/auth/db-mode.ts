/**
 * UAT / production data mode: operational data comes from Supabase only.
 * Cookie stores (calendar, reports, tickets, user overrides) are disabled.
 *
 * Set CONED_UAT_DB_ONLY=0 to re-enable cookie fallbacks for local offline demos.
 */
export function isDbOnlyMode(): boolean {
  const raw = process.env.CONED_UAT_DB_ONLY;
  if (raw == null || raw === '') return true; // default ON for UAT
  return !['0', 'false', 'no', 'off'].includes(raw.trim().toLowerCase());
}
