export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="page-shell space-y-4" aria-busy="true" aria-label="กำลังโหลด">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" style={{ width: '40%' }} />
      <div className="panel-card space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton skeleton-row" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="panel-card p-0 overflow-hidden" aria-busy="true">
      <div className="skeleton skeleton-row" style={{ height: 44, borderRadius: 0 }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-row"
          style={{ height: 40, margin: '8px 12px', width: 'auto' }}
        />
      ))}
    </div>
  );
}
