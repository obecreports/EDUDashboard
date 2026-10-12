/** Client-side image compress — shrink pixels + JPEG to save Storage + bandwidth. */

export type CompressOptions = {
  /** Longest edge in px */
  maxEdge: number;
  /** JPEG quality 0–1 */
  quality: number;
  /** Output mime (jpeg preferred for photos) */
  mime?: 'image/jpeg' | 'image/webp';
};

export const COVER_COMPRESS: CompressOptions = {
  maxEdge: 1280,
  quality: 0.74,
  mime: 'image/jpeg',
};

/** Report full-size (lightbox) — kept modest to save Storage + egress */
export const REPORT_COMPRESS: CompressOptions = {
  maxEdge: 800,
  quality: 0.65,
  mime: 'image/jpeg',
};

/** Report list thumbnails — tiny sibling file (`*.thumb.jpg`) */
export const REPORT_THUMB_COMPRESS: CompressOptions = {
  maxEdge: 320,
  quality: 0.55,
  mime: 'image/jpeg',
};

export const REPORT_IMAGE_MAX = 20;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    };
    img.src = url;
  });
}

/**
 * Resize + re-encode. Returns a File ready for Storage upload.
 * Skips work if already small enough JPEG under ~400KB and within maxEdge.
 */
export async function compressImageFile(
  file: File,
  opts: CompressOptions
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพ');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, opts.maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ไม่สามารถบีบอัดรูปได้');
  ctx.drawImage(img, 0, 0, w, h);

  const mime = opts.mime ?? 'image/jpeg';
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('บีบอัดรูปไม่สำเร็จ'))),
      mime,
      opts.quality
    );
  });

  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  const ext = mime === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
}
