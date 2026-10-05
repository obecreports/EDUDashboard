import type { HeroSiteSettings } from '@/lib/auth/mock-users';

function splitTitle(title: string): { line1: string; line2: string } {
  const marker = 'เพื่อการพัฒนา';
  const idx = title.indexOf(marker);
  if (idx > 0) {
    return { line1: title.slice(0, idx).trim(), line2: title.slice(idx).trim() };
  }
  const mid = Math.floor(title.length / 2);
  const space = title.indexOf(' ', mid);
  if (space > 0) {
    return { line1: title.slice(0, space).trim(), line2: title.slice(space).trim() };
  }
  return { line1: title, line2: '' };
}

export function HeroBanner({
  isAuthenticated: _isAuthenticated,
  settings,
}: {
  isAuthenticated: boolean;
  settings: HeroSiteSettings;
}) {
  const { line1, line2 } = splitTitle(settings.hero_title);
  const bg = settings.hero_bg_url?.trim();

  return (
    <section
      className="hero"
      aria-label="แบนเนอร์หลัก"
      style={
        bg
          ? {
              backgroundImage: `linear-gradient(135deg, rgba(22,52,86,0.88), rgba(41,86,143,0.82)), url(${bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="hero__inner">
        <h1 className="hero__title">
          {line1}
          {line2 ? (
            <>
              <br />
              {line2.includes('อย่างต่อเนื่อง') ? (
                <>
                  {line2.replace('อย่างต่อเนื่อง', '')}
                  <em>อย่างต่อเนื่อง</em>
                </>
              ) : (
                line2
              )}
            </>
          ) : null}
        </h1>
        <p className="hero__subtitle">{settings.hero_subtitle}</p>
      </div>
    </section>
  );
}
