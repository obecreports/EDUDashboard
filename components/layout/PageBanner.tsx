import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = {
  src: string;
  title: string;
  subtitle?: string;
  quote?: string;
  quoteMeta?: string;
  /** Soft wash so navy text stays readable on any photo */
  tone?: 'light' | 'dark';
  className?: string;
  children?: ReactNode;
};

export function PageBanner({
  src,
  title,
  subtitle,
  quote,
  quoteMeta,
  tone = 'light',
  className = '',
  children,
}: Props) {
  return (
    <header className={`page-banner page-banner--${tone} ${className}`.trim()}>
      <div className="page-banner__media" aria-hidden>
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="page-banner__img"
        />
        <div className="page-banner__overlay" />
      </div>
      <div className="page-banner__inner page-shell">
        <div className="page-banner__copy">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {children}
        </div>
        {(quote || quoteMeta) && (
          <aside className="page-banner__quote">
            {quoteMeta ? <span className="page-banner__quote-meta">{quoteMeta}</span> : null}
            {quote ? <p>{quote}</p> : null}
          </aside>
        )}
      </div>
    </header>
  );
}
