'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Clock3,
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { SchoolFull } from '@/lib/types';
import { PageBanner } from '@/components/layout/PageBanner';
import { PAGE_BANNERS } from '@/lib/types';
import { DEV_STATUS, STRATEGY_LABELS, statusFromScore, type DevStatusKey } from '@/lib/theme/status';

type VisitFilter = 'all' | 'never' | 'planned' | 'visited';

type Props = {
  schools: SchoolFull[];
  /** Guest vs staff copy / CTA visibility */
  mode?: 'guest' | 'staff';
  staffName?: string;
  initialQuery?: string;
};

const PAGE_SIZE = 12;

export function ManagedSchoolsClient({
  schools,
  mode = 'guest',
  staffName = 'อาสาสมัคร',
  initialQuery = '',
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<Set<DevStatusKey | 'all'>>(new Set(['all']));
  const [visitFilter, setVisitFilter] = useState<Set<VisitFilter>>(new Set(['all']));
  const [province, setProvince] = useState('');
  const [area, setArea] = useState('');
  const [size, setSize] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'score-asc' | 'score-desc' | 'name'>('score-asc');
  const [page, setPage] = useState(1);

  const provinces = useMemo(
    () =>
      [...new Set(schools.map((s) => s.province).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, 'th')
      ),
    [schools]
  );
  const areas = useMemo(
    () =>
      [...new Set(schools.map((s) => s.area_name || s.area_id).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b, 'th')
      ),
    [schools]
  );
  const sizes = useMemo(
    () =>
      [...new Set(schools.map((s) => s.school_size).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, 'th')
      ),
    [schools]
  );

  const counts = useMemo(() => {
    const c: Record<DevStatusKey | 'all', number> = {
      all: schools.length,
      urgent: 0,
      accelerate: 0,
      progressing: 0,
      strong: 0,
    };
    schools.forEach((s) => {
      c[statusFromScore(s.overallScore).key] += 1;
    });
    return c;
  }, [schools]);

  const filtered = useMemo(() => {
    let list = [...schools];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.school_name_th?.toLowerCase().includes(needle) ||
          s.province?.toLowerCase().includes(needle) ||
          String(s.school_id).includes(needle)
      );
    }
    if (!statusFilter.has('all')) {
      list = list.filter((s) => statusFilter.has(statusFromScore(s.overallScore).key));
    }
    // Visit status: no real visit data yet — treat as never for filter UX demo
    if (!visitFilter.has('all')) {
      if (visitFilter.has('never') && !visitFilter.has('planned') && !visitFilter.has('visited')) {
        // keep all until visit data exists
      }
    }
    if (province) list = list.filter((s) => s.province === province);
    if (area) list = list.filter((s) => (s.area_name || s.area_id) === area);
    if (size) list = list.filter((s) => s.school_size === size);

    list.sort((a, b) => {
      if (sort === 'name') return (a.school_name_th || '').localeCompare(b.school_name_th || '', 'th');
      const sa = a.overallScore ?? 0;
      const sb = b.overallScore ?? 0;
      return sort === 'score-asc' ? sa - sb : sb - sa;
    });
    return list;
  }, [schools, q, statusFilter, visitFilter, province, area, size, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleStatus = (key: DevStatusKey | 'all') => {
    if (key === 'all') {
      setStatusFilter(new Set(['all']));
      return;
    }
    const next = new Set(statusFilter);
    next.delete('all');
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (next.size === 0) next.add('all');
    setStatusFilter(next);
    setPage(1);
  };

  const toggleVisit = (key: VisitFilter) => {
    if (key === 'all') {
      setVisitFilter(new Set(['all']));
      return;
    }
    const next = new Set(visitFilter);
    next.delete('all');
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (next.size === 0) next.add('all');
    setVisitFilter(next);
    setPage(1);
  };

  const reset = () => {
    setQ('');
    setStatusFilter(new Set(['all']));
    setVisitFilter(new Set(['all']));
    setProvince('');
    setArea('');
    setSize('');
    setPage(1);
  };

  const title =
    mode === 'staff' ? 'โรงเรียนในความดูแลของฉัน' : 'โรงเรียนในโครงการทั้งหมด';
  const subtitle =
    mode === 'staff'
      ? `โรงเรียนทั้งหมด ${schools.length} แห่ง ในความดูแลของ${staffName || 'อาสาสมัคร'}`
      : `โรงเรียนในโครงการกองทุนการศึกษา ${schools.length} แห่ง`;

  return (
    <div className="managed-schools">
      <PageBanner
        src={PAGE_BANNERS.schools}
        title={title}
        subtitle={subtitle}
        quote="“ทุกโรงเรียนมีศักยภาพ ทุกการสนับสนุนสร้างการเปลี่ยนแปลงได้”"
      />

      <div className="page-shell py-5 space-y-5">
        <div className="managed-status-row">
          <div className="status-card" style={{ borderColor: '#BFDBFE' }}>
            <div className="status-card__icon" style={{ background: '#DBEAFE', color: '#0B4DA2' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div className="status-card__value text-tm-blue">{counts.all}</div>
              <div className="status-card__label">
                {mode === 'staff' ? 'โรงเรียนในความดูแล' : 'โรงเรียนทั้งหมด'}
              </div>
            </div>
          </div>
          {(Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => {
            const meta = DEV_STATUS[k];
            const Icon =
              k === 'urgent'
                ? AlertTriangle
                : k === 'accelerate'
                  ? TrendingUp
                  : k === 'progressing'
                    ? Clock3
                    : Star;
            return (
              <div key={k} className="status-card" style={{ borderColor: meta.border, background: meta.bg }}>
                <div className="status-card__icon" style={{ background: '#fff', color: meta.color }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="status-card__value" style={{ color: meta.color }}>
                    {counts[k]}
                  </div>
                  <div className="status-card__label">{meta.label}</div>
                </div>
              </div>
            );
          })}
          <div className="status-card managed-status-quote">
            ร่วมกันสนับสนุน ให้โรงเรียนก้าวไปข้างหน้า
          </div>
        </div>

        <div className="ed-managed-layout">
          <aside className="ed-card p-4 space-y-4 h-fit managed-filters">
            <label className="block text-sm font-semibold">
              ค้นหา
              <input
                className="form-input"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="ชื่อโรงเรียน จังหวัด หรือรหัส"
              />
            </label>

            <div>
              <div className="text-sm font-bold mb-2">สถานะการพัฒนา</div>
              <label className="ed-check">
                <input
                  type="checkbox"
                  checked={statusFilter.has('all')}
                  onChange={() => toggleStatus('all')}
                />
                ทั้งหมด ({counts.all})
              </label>
              {(Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => (
                <label key={k} className="ed-check">
                  <input
                    type="checkbox"
                    checked={statusFilter.has(k)}
                    onChange={() => toggleStatus(k)}
                  />
                  {DEV_STATUS[k].label} ({counts[k]})
                </label>
              ))}
            </div>

            <div>
              <div className="text-sm font-bold mb-2">สถานะการลงพื้นที่</div>
              {(
                [
                  ['all', 'ทั้งหมด'],
                  ['never', 'ยังไม่เคยลงพื้นที่'],
                  ['planned', 'นัดหมายแล้ว'],
                  ['visited', 'ลงพื้นที่แล้ว'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="ed-check">
                  <input
                    type="checkbox"
                    checked={visitFilter.has(key)}
                    onChange={() => toggleVisit(key)}
                  />
                  {label}
                </label>
              ))}
            </div>

            <label className="block text-sm font-semibold">
              จังหวัด
              <select
                className="form-input"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">ทั้งหมด</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              เขตพื้นที่การศึกษา
              <select
                className="form-input"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">ทั้งหมด</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              ขนาดโรงเรียน
              <select
                className="form-input"
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">ทั้งหมด</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="ed-btn ed-btn--outline w-full justify-center"
              onClick={reset}
            >
              <RefreshCw size={16} /> ล้างตัวกรอง
            </button>
          </aside>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="ed-section-title m-0 text-base">
                รายชื่อโรงเรียน ({filtered.length} แห่ง)
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className={`navbar__link ${view === 'grid' ? 'navbar__link--active' : ''}`}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid size={14} /> การ์ด
                </button>
                <button
                  type="button"
                  className={`navbar__link ${view === 'list' ? 'navbar__link--active' : ''}`}
                  onClick={() => setView('list')}
                >
                  <List size={14} /> รายการ
                </button>
                <label className="text-sm font-semibold flex items-center gap-2">
                  เรียงตาม
                  <select
                    className="form-input"
                    style={{ width: 'auto', minHeight: '2.4rem' }}
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as typeof sort);
                      setPage(1);
                    }}
                  >
                    <option value="score-asc">ต้องติดตามก่อน</option>
                    <option value="score-desc">คะแนนสูง → ต่ำ</option>
                    <option value="name">ชื่อโรงเรียน</option>
                  </select>
                </label>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="ed-card p-6 text-center text-slate-500">ไม่พบโรงเรียนตามเงื่อนไข</div>
            ) : (
              <div className={view === 'grid' ? 'ed-school-grid ed-school-grid--3' : 'space-y-3'}>
                {pageRows.map((s) => {
                  const st = statusFromScore(s.overallScore);
                  const score = s.overallScore ?? 0;
                  const loc = [s.province, s.area_name || s.district].filter(Boolean).join(' • ');
                  return (
                    <article key={String(s.school_id)} className="ed-card ed-school-card overflow-hidden">
                      <div
                        className="ed-school-card__cover"
                        style={{
                          backgroundImage: `linear-gradient(160deg, ${st.bg}cc 0%, transparent 55%), url(${PAGE_BANNERS.schools})`,
                          backgroundSize: 'cover',
                          backgroundPosition: `${(Number(s.school_id) % 5) * 20}% center`,
                        }}
                        aria-hidden
                      />
                      <div className="p-4 space-y-3">
                        <div>
                          <Link
                            href={`/schools/${s.school_id}`}
                            className="font-bold text-tm-blue hover:underline text-base"
                          >
                            {s.school_name_th}
                          </Link>
                          <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin size={14} />
                            {loc || '—'}
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="text-2xl font-extrabold text-tm-blue">
                            {score.toFixed(2)}
                            <span className="text-sm text-slate-400 font-semibold"> / 5.00</span>
                          </div>
                          <span className="ed-badge" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>
                        <div className="ed-mini-pillars">
                          {STRATEGY_LABELS.map((p) => (
                            <div key={p.key}>
                              <div className="text-[10px] font-bold" style={{ color: p.color }}>
                                {p.short}
                              </div>
                              <div className="text-xs font-semibold">
                                {(s.pillarScores?.[p.key] ?? 0).toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-500">ยังไม่เคยลงพื้นที่</div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/schools/${s.school_id}`}
                            className="ed-btn ed-btn--outline ed-btn--sm"
                          >
                            ดูข้อมูลโรงเรียน
                          </Link>
                          {mode === 'staff' ? (
                            <Link href="/staff/calendar" className="ed-btn ed-btn--primary ed-btn--sm">
                              เตรียมลงพื้นที่
                            </Link>
                          ) : (
                            <Link href={`/schools/${s.school_id}`} className="ed-btn ed-btn--primary ed-btn--sm">
                              ดูรายงาน
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="managed-pagination">
                <span>
                  แสดง {(page - 1) * PAGE_SIZE + 1} -{' '}
                  {Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="navbar__link"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`navbar__link ${page === n ? 'navbar__link--active' : ''}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="navbar__link"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
