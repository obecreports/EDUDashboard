/**
 * Display helpers for Storage images.
 *
 * Report uploads store two files:
 *   full  → …/{id}.jpg
 *   thumb → …/{id}.thumb.jpg   (list/grid — much less egress)
 *
 * Image Transformation (/render/image/) is opt-in only.
 */

/** Thumbnail width hint (CSS); file is already ~320px when dual-upload exists */
export const REPORT_THUMB_WIDTH = 240;

/** Cover card width hint */
export const COVER_CARD_WIDTH = 640;

const USE_STORAGE_TRANSFORM =
  process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM === '1';

/** Map full object URL → sibling `*.thumb.jpg` (same bucket/path). */
export function reportThumbSiblingUrl(url: string): string {
  if (!url || url.startsWith('/')) return url;
  try {
    const u = new URL(url);
    // …/uuid.jpg → …/uuid.thumb.jpg  (skip if already a thumb)
    if (/\.thumb\.jpe?g$/i.test(u.pathname)) return url;
    if (/\.jpe?g$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\.jpe?g$/i, '.thumb.jpg');
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

function withTransform(url: string, width: number, quality = 65): string {
  if (!url || url.startsWith('/') || !USE_STORAGE_TRANSFORM) return url;
  try {
    const u = new URL(url);
    if (u.pathname.includes('/storage/v1/object/public/')) {
      u.pathname = u.pathname.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
      );
      u.searchParams.set('width', String(width));
      u.searchParams.set('quality', String(quality));
      u.searchParams.set('resize', 'contain');
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

/** Prefer dual-upload thumb file; fall back to full / transform. */
export function mediaThumbUrl(url: string, width = REPORT_THUMB_WIDTH): string {
  if (USE_STORAGE_TRANSFORM) return withTransform(url, width, 55);
  return reportThumbSiblingUrl(url);
}

export function mediaCardUrl(url: string, width = COVER_CARD_WIDTH): string {
  return withTransform(url, width, 70);
}
