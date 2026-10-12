/** Parse cookie values written with or without a manual encodeURIComponent pass. */
export function parseJsonCookieValue<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw)) as T;
    } catch {
      return fallback;
    }
  }
}
