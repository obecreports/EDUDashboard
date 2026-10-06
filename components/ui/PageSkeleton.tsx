import type { CSSProperties } from 'react';

/** Layout-matched loading skeletons for major routes */

function Bone({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden />;
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="page-shell space-y-4" aria-busy="true" aria-label="กำลังโหลด">
      <Bone className="skeleton-title" />
      <Bone className="skeleton-line" style={{ width: '40%' }} />
      <div className="panel-card space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className="skeleton-row" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="panel-card p-0 overflow-hidden" aria-busy="true">
      <Bone className="skeleton-row" style={{ height: 44, borderRadius: 0 }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Bone
          key={i}
          className="skeleton-row"
          style={{ height: 40, margin: '8px 12px', width: 'auto' }}
        />
      ))}
    </div>
  );
}

/** `/schools` — sidebar filters + 3-col school cards (mockup image 1) */
export function ManagedSchoolsSkeleton() {
  return (
    <div className="managed-schools" aria-busy="true" aria-label="กำลังโหลดรายชื่อโรงเรียน">
      <div className="sk-banner">
        <div className="page-shell sk-banner__inner">
          <div className="space-y-3" style={{ flex: 1 }}>
            <Bone style={{ height: 28, width: 'min(420px, 70%)' }} />
            <Bone style={{ height: 14, width: 'min(320px, 55%)' }} />
          </div>
          <Bone style={{ height: 72, width: 240, borderRadius: 16 }} />
        </div>
      </div>

      <div className="page-shell py-5 space-y-5">
        <div className="managed-status-row">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="status-card sk-status-card">
              <Bone style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
              <div className="space-y-2" style={{ flex: 1 }}>
                <Bone style={{ height: 20, width: '40%' }} />
                <Bone style={{ height: 12, width: '80%' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="ed-managed-layout">
          <aside className="ed-card p-4 space-y-4 h-fit">
            <Bone style={{ height: 14, width: 64 }} />
            <Bone style={{ height: 40, width: '100%', borderRadius: 10 }} />
            <Bone style={{ height: 14, width: 120 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Bone style={{ width: 16, height: 16, borderRadius: 4 }} />
                <Bone style={{ height: 12, width: `${60 + (i % 3) * 12}%` }} />
              </div>
            ))}
            <Bone style={{ height: 14, width: 140 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <Bone key={i} style={{ height: 40, width: '100%', borderRadius: 10 }} />
            ))}
            <Bone style={{ height: 42, width: '100%', borderRadius: 999 }} />
          </aside>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Bone style={{ height: 20, width: 180 }} />
              <div className="flex gap-2">
                <Bone style={{ height: 36, width: 72, borderRadius: 999 }} />
                <Bone style={{ height: 36, width: 72, borderRadius: 999 }} />
                <Bone style={{ height: 36, width: 140, borderRadius: 10 }} />
              </div>
            </div>
            <div className="ed-school-grid ed-school-grid--3">
              {Array.from({ length: 6 }).map((_, i) => (
                <article key={i} className="ed-card ed-school-card overflow-hidden">
                  <Bone style={{ height: 110, width: '100%', borderRadius: 0 }} />
                  <div className="p-4 space-y-3">
                    <Bone style={{ height: 18, width: '85%' }} />
                    <Bone style={{ height: 12, width: '55%' }} />
                    <div className="flex justify-between items-center gap-2">
                      <Bone style={{ height: 28, width: 100 }} />
                      <Bone style={{ height: 24, width: 88, borderRadius: 999 }} />
                    </div>
                    <div className="ed-mini-pillars">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="space-y-1 flex flex-col items-center">
                          <Bone style={{ height: 10, width: 14 }} />
                          <Bone style={{ height: 12, width: 22 }} />
                        </div>
                      ))}
                    </div>
                    <Bone style={{ height: 12, width: '70%' }} />
                    <div className="flex gap-2">
                      <Bone style={{ height: 36, flex: 1, borderRadius: 999 }} />
                      <Bone style={{ height: 36, flex: 1, borderRadius: 999 }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** `/strategy` — 5 metric cards + analytics row (mockup image 3) */
export function StrategySkeleton() {
  return (
    <div className="strategy-page" aria-busy="true" aria-label="กำลังโหลดภาพรวมกลยุทธ์">
      <div className="sk-banner">
        <div className="page-shell sk-banner__inner">
          <div className="space-y-3" style={{ flex: 1 }}>
            <Bone style={{ height: 28, width: 'min(480px, 75%)' }} />
            <Bone style={{ height: 14, width: 'min(360px, 60%)' }} />
          </div>
          <Bone style={{ height: 80, width: 220, borderRadius: 16 }} />
        </div>
      </div>

      <div className="page-shell space-y-5 py-5">
        <div className="ed-strategy-row">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ed-card strategy-metric">
              <div className="flex items-center gap-2">
                <Bone style={{ width: 32, height: 32, borderRadius: 10 }} />
                <Bone style={{ height: 14, width: '60%' }} />
              </div>
              <Bone style={{ height: 28, width: '50%' }} />
              <Bone style={{ height: 22, width: 90, borderRadius: 999 }} />
              <Bone style={{ height: 12, width: '80%' }} />
            </div>
          ))}
        </div>

        <div className="ed-analytics-row">
          <section className="ed-card p-4 space-y-3">
            <Bone style={{ height: 18, width: 160 }} />
            <div className="sk-radar">
              <Bone className="sk-radar__ring" />
            </div>
          </section>
          <section className="ed-card p-4 space-y-3">
            <Bone style={{ height: 18, width: 200 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Bone style={{ height: 12, width: '40%' }} />
                <Bone style={{ height: 12, width: '100%', borderRadius: 999 }} />
              </div>
            ))}
          </section>
          <section className="ed-card p-4 space-y-3">
            <Bone style={{ height: 18, width: 120 }} />
            <Bone style={{ height: 72, width: '100%', borderRadius: 12 }} />
            <Bone style={{ height: 72, width: '100%', borderRadius: 12 }} />
            <Bone style={{ height: 64, width: '100%', borderRadius: 12 }} />
          </section>
        </div>

        <div className="ed-bottom-row">
          <section className="ed-card p-4 space-y-3">
            <Bone style={{ height: 18, width: 220 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <Bone style={{ height: 12, width: '45%' }} />
                  <Bone style={{ height: 12, width: 28 }} />
                </div>
                <Bone style={{ height: 8, width: '100%', borderRadius: 999 }} />
              </div>
            ))}
          </section>
          <section className="ed-card p-4 space-y-3">
            <Bone style={{ height: 18, width: 200 }} />
            <Bone style={{ height: 120, width: '100%', borderRadius: 12 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} style={{ height: 14, width: `${70 - i * 8}%` }} />
            ))}
          </section>
          <section className="ed-card p-4 space-y-2">
            <Bone style={{ height: 18, width: 80 }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} style={{ height: 44, width: '100%', borderRadius: 12 }} />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

/** `/schools/[id]` — header, tabs, content panels */
export function SchoolDetailSkeleton() {
  return (
    <div className="page-shell" style={{ maxWidth: 1100 }} aria-busy="true" aria-label="กำลังโหลดข้อมูลโรงเรียน">
      <div className="ed-card overflow-hidden mb-4">
        <Bone style={{ height: 160, width: '100%', borderRadius: 0 }} />
        <div className="p-5 space-y-3">
          <Bone style={{ height: 26, width: 'min(420px, 70%)' }} />
          <Bone style={{ height: 14, width: 'min(280px, 50%)' }} />
          <div className="flex flex-wrap gap-2">
            <Bone style={{ height: 28, width: 100, borderRadius: 999 }} />
            <Bone style={{ height: 28, width: 88, borderRadius: 999 }} />
            <Bone style={{ height: 28, width: 120, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} style={{ height: 40, width: 110, borderRadius: 999 }} />
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(240px, 0.8fr)' }}>
        <div className="ed-card p-4 space-y-3">
          <Bone style={{ height: 18, width: 160 }} />
          <div className="sk-radar" style={{ minHeight: 220 }}>
            <Bone className="sk-radar__ring" />
          </div>
          <Bone style={{ height: 14, width: '90%' }} />
          <Bone style={{ height: 14, width: '70%' }} />
        </div>
        <div className="space-y-4">
          <div className="ed-card p-4 space-y-3">
            <Bone style={{ height: 18, width: 100 }} />
            <Bone style={{ height: 140, width: '100%', borderRadius: 12 }} />
          </div>
          <div className="ed-card p-4 space-y-2">
            <Bone style={{ height: 18, width: 120 }} />
            <Bone style={{ height: 12, width: '80%' }} />
            <Bone style={{ height: 12, width: '65%' }} />
            <Bone style={{ height: 12, width: '75%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
