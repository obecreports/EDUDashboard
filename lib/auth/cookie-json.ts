import { cookies } from 'next/headers';
import { parseJsonCookieValue } from '@/lib/auth/cookie-json-parse';
import {
  ALL_PURGEABLE_COOKIES,
  COOKIE_HEADER_SOFT_LIMIT,
  COOKIE_HEADER_TARGET,
  PURGEABLE_DATA_COOKIES,
} from '@/lib/auth/cookie-budget';

export { parseJsonCookieValue } from '@/lib/auth/cookie-json-parse';

export const JSON_COOKIE_OPTS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
};

/**
 * Per-cookie cap — keep well under ~4KB browser limit and leave room for
 * several ConED cookies in one request header.
 */
const MAX_ENCODED_BYTES = 2400;

export class CookieTooLargeError extends Error {
  constructor(name: string, encodedLen: number) {
    super(`คุกกี้ ${name} ใหญ่เกินกำหนด (${encodedLen} bytes)`);
    this.name = 'CookieTooLargeError';
  }
}

export async function readJsonCookie<T>(name: string, fallback: T): Promise<T> {
  const jar = await cookies();
  return parseJsonCookieValue(jar.get(name)?.value, fallback);
}

function estimateJarBytes(
  jar: Awaited<ReturnType<typeof cookies>>,
  override?: { name: string; encodedLen: number }
): number {
  let total = 0;
  for (const c of jar.getAll()) {
    if (override && c.name === override.name) continue;
    total += c.name.length + 1 + (c.value?.length ?? 0) + 2;
  }
  if (override) {
    total += override.name.length + 1 + override.encodedLen + 2;
  }
  return total;
}

/** Expire mock data cookies (and legacy names) so later requests stay under header limits. */
export async function clearPurgeableDataCookies(): Promise<void> {
  const jar = await cookies();
  for (const name of PURGEABLE_DATA_COOKIES) {
    jar.delete(name);
  }
}

/** Aggressive clear used when header is already too large. */
export async function clearAllPurgeableCookies(): Promise<void> {
  const jar = await cookies();
  for (const name of ALL_PURGEABLE_COOKIES) {
    jar.delete(name);
  }
}

/**
 * If the jar is already near the soft limit, drop data cookies until there is
 * headroom for `neededEncodedLen` more bytes on `name`.
 */
async function makeRoomForCookie(name: string, neededEncodedLen: number): Promise<void> {
  const jar = await cookies();
  let total = estimateJarBytes(jar, { name, encodedLen: neededEncodedLen });
  if (total <= COOKIE_HEADER_SOFT_LIMIT) return;

  for (const victim of PURGEABLE_DATA_COOKIES) {
    if (victim === name) continue;
    if (!jar.get(victim)?.value) continue;
    jar.delete(victim);
    total = estimateJarBytes(jar, { name, encodedLen: neededEncodedLen });
    if (total <= COOKIE_HEADER_TARGET) return;
  }
}

/**
 * Write JSON cookie. Pass raw JSON — Next.js encodeURIComponents once.
 * Do NOT pre-encode (Thai text double-encoding blows past 4KB and Set-Cookie is dropped).
 */
export async function writeJsonCookie(name: string, value: unknown): Promise<void> {
  const jar = await cookies();
  const payload = JSON.stringify(value);
  const encodedLen = encodeURIComponent(payload).length;
  if (encodedLen > MAX_ENCODED_BYTES) {
    throw new CookieTooLargeError(name, encodedLen);
  }
  await makeRoomForCookie(name, encodedLen);
  // Re-check after purge — still too big means this write can't fit
  if (estimateJarBytes(jar, { name, encodedLen }) > COOKIE_HEADER_SOFT_LIMIT + 2000) {
    throw new CookieTooLargeError(name, encodedLen);
  }
  jar.set(name, payload, JSON_COOKIE_OPTS);
}

/** Keep trimming via `shrink` until the payload fits (or shrink returns null). */
export async function writeJsonCookieWithShrink<T>(
  name: string,
  value: T,
  shrink: (current: T) => T | null
): Promise<T> {
  let current = value;
  for (let i = 0; i < 40; i++) {
    try {
      await writeJsonCookie(name, current);
      return current;
    } catch (e) {
      if (!(e instanceof CookieTooLargeError)) throw e;
      const next = shrink(current);
      if (next == null) throw e;
      current = next;
    }
  }
  throw new CookieTooLargeError(name, MAX_ENCODED_BYTES);
}
