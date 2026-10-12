import {
  AUTH_CREDENTIALS_COOKIE,
  AUTH_USERS_COOKIE,
  CALENDAR_EVENTS_COOKIE,
  REPORT_DRAFTS_COOKIE,
  SCHOOL_COMMENTS_COOKIE,
  SCHOOL_EXTRAS_COOKIE,
  SITE_SETTINGS_COOKIE,
  TICKETS_COOKIE,
} from '@/lib/auth/mock-users';

/** Soft cap for the entire `Cookie` request header (Node/Next often fail near 16KB). */
export const COOKIE_HEADER_SOFT_LIMIT = 10_000;

/** Target after purge — leave room for session + a couple of small cookies. */
export const COOKIE_HEADER_TARGET = 6_000;

/**
 * Mock data cookies that can be wiped without forcing re-login.
 * Order = purge priority (largest / least critical first).
 */
export const PURGEABLE_DATA_COOKIES = [
  SCHOOL_EXTRAS_COOKIE,
  SCHOOL_COMMENTS_COOKIE,
  CALENDAR_EVENTS_COOKIE,
  REPORT_DRAFTS_COOKIE,
  TICKETS_COOKIE,
  SITE_SETTINGS_COOKIE,
  // Legacy names from earlier bumps — may still sit in browsers
  'coned-calendar-events',
  'coned-calendar-events-v2',
  'coned-school-comments',
  'coned-report-drafts',
  'coned-demo-role',
] as const;

/** Auth-adjacent cookies — only purge if still over budget after data cookies. */
export const PURGEABLE_AUTH_OVERFLOW_COOKIES = [
  AUTH_USERS_COOKIE,
  AUTH_CREDENTIALS_COOKIE,
] as const;

export const ALL_PURGEABLE_COOKIES = [
  ...PURGEABLE_DATA_COOKIES,
  ...PURGEABLE_AUTH_OVERFLOW_COOKIES,
] as const;

export function cookieHeaderByteLength(cookieHeader: string | null | undefined): number {
  return cookieHeader?.length ?? 0;
}

export type CookieClearTarget = {
  set: (name: string, value: string, opts: { path: string; maxAge: number }) => void;
};

/** Expire cookies on a NextResponse / ResponseCookies jar. */
export function expireCookies(
  target: CookieClearTarget,
  names: readonly string[]
): string[] {
  const cleared: string[] = [];
  for (const name of names) {
    target.set(name, '', { path: '/', maxAge: 0 });
    cleared.push(name);
  }
  return cleared;
}

/**
 * Given a raw Cookie header, pick which cookies to expire so the next request
 * stays under budget. Prefer data cookies; only touch auth overflow if needed.
 */
export function planCookiePurge(cookieHeader: string | null | undefined): string[] {
  const raw = cookieHeader ?? '';
  if (raw.length <= COOKIE_HEADER_SOFT_LIMIT) return [];

  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  const byName = new Map<string, number>();
  for (const part of parts) {
    const eq = part.indexOf('=');
    const name = eq >= 0 ? part.slice(0, eq) : part;
    const value = eq >= 0 ? part.slice(eq + 1) : '';
    // name=value + "; "
    byName.set(name, (byName.get(name) ?? 0) + name.length + 1 + value.length + 2);
  }

  let remaining = raw.length;
  const toClear: string[] = [];

  const tryPurge = (names: readonly string[]) => {
    for (const name of names) {
      if (remaining <= COOKIE_HEADER_TARGET) break;
      const size = byName.get(name);
      if (!size) continue;
      toClear.push(name);
      remaining -= size;
      byName.delete(name);
    }
  };

  tryPurge(PURGEABLE_DATA_COOKIES);
  if (remaining > COOKIE_HEADER_TARGET) {
    tryPurge(PURGEABLE_AUTH_OVERFLOW_COOKIES);
  }

  return toClear;
}
