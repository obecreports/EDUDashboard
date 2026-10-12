'use client';

import { useState } from 'react';
import { mediaThumbUrl } from '@/lib/media/image-display';

/** Lazy thumbnail grid — click opens full (already compressed) image. */
export function ImageThumbGrid({
  urls,
  label = 'รูปแนบ',
}: {
  urls: string[];
  label?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!urls.length) return null;

  return (
    <>
      <div className="report-img-grid" aria-label={label}>
        {urls.map((url) => (
          <button
            key={url}
            type="button"
            className="report-img-grid__item"
            onClick={() => setOpen(url)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaThumbUrl(url)}
              alt=""
              loading="lazy"
              decoding="async"
              width={120}
              height={90}
              onError={(e) => {
                // Older uploads may lack *.thumb.jpg — fall back to full once
                const img = e.currentTarget;
                if (img.dataset.fallback !== '1' && img.src !== url) {
                  img.dataset.fallback = '1';
                  img.src = url;
                }
              }}
            />
          </button>
        ))}
      </div>
      {open && (
        <div
          className="report-img-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="ed-btn ed-btn--outline ed-btn--sm" onClick={() => setOpen(null)}>
            ปิด
          </button>
        </div>
      )}
    </>
  );
}
