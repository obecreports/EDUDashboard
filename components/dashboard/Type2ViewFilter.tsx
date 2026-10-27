'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { T2_VIEW_TYPE1S_COOKIE } from '@/lib/auth/province-radar';

export type Type2ViewType1Option = {
  id: string;
  label: string;
  provinces: string[];
};

function writeCookie(ids: string[]) {
  const value = encodeURIComponent(JSON.stringify(ids));
  document.cookie = `${T2_VIEW_TYPE1S_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

/**
 * Multi-select of overlapping Type 1s for Type 2 view scope.
 * Default = all selected; clearing all → own action provinces (server treats empty as own).
 */
export function Type2ViewFilter({
  options,
  initialSelectedIds,
}: {
  options: Type2ViewType1Option[];
  /** null = first visit → treat as all selected */
  initialSelectedIds: string[] | null;
}) {
  const allIds = useMemo(() => options.map((o) => o.id), [options]);
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialSelectedIds == null) return new Set(allIds);
    return new Set(initialSelectedIds.filter((id) => allIds.includes(id)));
  });
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSelectedIds == null && allIds.length) {
      writeCookie(allIds);
    }
  }, [initialSelectedIds, allIds]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (options.length === 0) return null;

  const summary =
    selected.size === 0
      ? 'จังหวัดที่รับผิดชอบเอง'
      : selected.size === allIds.length
        ? `ทั้งหมด (${allIds.length})`
        : `เลือก ${selected.size}/${allIds.length}`;

  const apply = (next: Set<string>) => {
    setSelected(next);
    writeCookie([...next]);
    startTransition(() => {
      window.location.reload();
    });
  };

  return (
    <div className="t2-view-filter" ref={ref}>
      <div className="t2-view-filter__head">
        <span className="t2-view-filter__title">เลือกองคมนตรี</span>
        <span className="t2-view-filter__hint">
          สามารถเลือกมุมมองขององคมนตรีแต่ละท่าน หรือจะดูของทุกท่านที่คุณมีจังหวัดที่เกี่ยวข้องพร้อมกันทั้งหมด
        </span>
      </div>
      <div className="so-filter-dd t2-view-filter__dd">
        <button
          type="button"
          className="so-filter-dd__btn"
          aria-expanded={open}
          disabled={pending}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="so-filter-dd__label">องคมนตรี</span>
          <span className="so-filter-dd__value">{summary}</span>
          <ChevronDown size={14} className={open ? 'is-open' : ''} />
        </button>
        {open && (
          <div className="so-filter-dd__menu" role="listbox" aria-multiselectable>
            <div className="so-filter-dd__actions">
              <button type="button" onClick={() => apply(new Set())}>
                ล้าง
              </button>
              <button type="button" onClick={() => apply(new Set(allIds))}>
                เลือกทั้งหมด
              </button>
            </div>
            <div className="so-filter-dd__list">
              {options.map((o) => (
                <label key={o.id} className="so-filter-dd__item">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(o.id)) next.delete(o.id);
                      else next.add(o.id);
                      apply(next);
                    }}
                  />
                  <span>
                    {o.label}
                    {o.provinces.length > 0 ? (
                      <em> · {o.provinces.join(', ')}</em>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
