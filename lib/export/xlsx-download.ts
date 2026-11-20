import * as XLSXModule from 'xlsx';

/** Webpack/Next may expose either namespace or `.default` for CJS `xlsx`. */
const XLSX =
  (XLSXModule as { default?: typeof XLSXModule }).default ?? XLSXModule;

/** Download rows as .xlsx (browser). First row keys = headers if array of objects. */
export function downloadRowsAsXlsx(
  rows: Record<string, string | number | boolean | null | undefined>[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const safe = filename.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  const name = safe.toLowerCase().endsWith('.xlsx') ? safe : `${safe}.xlsx`;
  XLSX.writeFile(wb, name);
}
