'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  Building2,
  Clock3,
  LayoutGrid,
  List,
  MapPin,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { SchoolFull } from '@/lib/types';
import {
  DEV_STATUS,
  DEV_STATUS_ORDER,
  STRATEGY_LABELS,
  statusFromScore,
  type DevStatusKey,
} from '@/lib/theme/status';

function statusIcon(key: DevStatusKey) {
  if (key === 'develop') return AlertTriangle;
  if (key === 'fair') return TrendingUp;
  if (key === 'good') return Clock3;
  if (key === 'veryGood') return Star;
  return Award;
}

type Props = {
  schools: SchoolFull[];
  staffName: string;
};

export function StaffManagedSchoolsClient({ schools, staffName }: Props) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<DevStatusKey | 'all'>>(new Set(['all']));
  const [province, setProvince] = useState('');
  const [area, setArea] = useState('');
  const [size, setSize] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'score-asc' | 'score-desc' | 'name'>('score-asc');

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
      develop: 0,
      fair: 0,
      good: 0,
      veryGood: 0,
      excellent: 0,
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
          String(s.school_id).includes(needle)
      );
    }
    if (!statusFilter.has('all')) {
      list = list.filter((s) => statusFilter.has(statusFromScore(s.overallScore).key));
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
  }, [schools, q, statusFilter, province, area, size, sort]);

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
  };

  const reset = () => {
    setQ('');
    setStatusFilter(new Set(['all']));
    setProvince('');
    setArea('');
    setSize('');
  };

  return (
    <div>
      <header className="ed-page-hero">
        <div className="ed-page-hero__inner">
          <div>
            <h1>โรงเรียนของฉัน</h1>
            <p>
              โรงเรียนทั้งหมด {schools.length} แห่ง · {staffName || 'อาสาสมัคร'}
            </p>
          </div>
          <p className="ed-card p-3 max-w-sm text-sm text-slate-600 m-0">
            ทุกโรงเรียนมีศักยภาพ ทุกการสนับสนุนสร้างการเปลี่ยนแปลงได้
          </p>
        </div>
      </header>

      <div className="page-shell py-5 space-y-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div className="status-card" style={{ borderColor: '#BFDBFE' }}>
            <div className="status-card__icon" style={{ background: '#DBEAFE', color: '#0B4DA2' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div className="status-card__value text-tm-blue">{counts.all}</div>
              <div className="status-card__label">โรงเรียนของฉัน</div>
            </div>
          </div>
          {DEV_STATUS_ORDER.map((k) => {
            const meta = DEV_STATUS[k];
            const Icon = statusIcon(k);
            return (
              <div
                key={k}
                className="status-card"
                style={{ borderColor: meta.border, background: meta.bg }}
              >
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
        </div>

        <div className="ed-managed-layout">
          <aside className="ed-card p-4 space-y-4 h-fit">
            <label className="block text-sm font-semibold">
              ค้นหา
              <input
                className="form-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ชื่อโรงเรียนหรือรหัส"
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
              {DEV_STATUS_ORDER.map((k) => (
                <label key={k} className="ed-check">
                  <input
                    type="checkbox"
                    checked={statusFilter.has(k)}
                    onChange={() => toggleStatus(k)}
                  />
                  <span style={{ color: DEV_STATUS[k].color, fontWeight: 700 }}>
                    {DEV_STATUS[k].label}
                  </span>
                  <span className="text-slate-500"> ({counts[k]})</span>
                </label>
              ))}
            </div>

            <label className="block text-sm font-semibold">
              จังหวัด
              <select className="form-input" value={province} onChange={(e) => setProvince(e.target.value)}>
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
              <select className="form-input" value={area} onChange={(e) => setArea(e.target.value)}>
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
              <select className="form-input" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">ทั้งหมด</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="ed-btn ed-btn--outline w-full justify-center" onClick={reset}>
              ล้างตัวกรอง
            </button>
          </aside>

          <section className="space-y-3 ed-card p-4">
            <h2 className="ed-section-title m-0 text-base">
              รายชื่อโรงเรียน ({filtered.length} แห่ง)
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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
              </div>
              <select
                className="form-input ml-auto"
                style={{ width: 'auto', minHeight: '2.4rem' }}
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="score-asc">คะแนนต่ำ → สูง</option>
                <option value="score-desc">คะแนนสูง → ต่ำ</option>
                <option value="name">ชื่อโรงเรียน</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="ed-card p-6 text-center text-slate-500">ไม่พบโรงเรียนตามเงื่อนไข</div>
            ) : (
              <div className={view === 'grid' ? 'ed-school-grid' : 'space-y-3'}>
                {filtered.map((s) => {
                  const st = statusFromScore(s.overallScore);
                  const score = s.overallScore ?? 0;
                  return (
                    <article key={String(s.school_id)} className="ed-card ed-school-card overflow-hidden">
                      <div
                        className="ed-school-card__cover"
                        style={{
                          background: `linear-gradient(135deg, ${st.bg}, #dbeafe)`,
                        }}
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
                            {s.province || '—'}
                            {s.district ? ` · ${s.district}` : ''}
                          </div>
                          {(s.area_name || s.Gov_Domain?.area_name) && (
                            <div className="text-xs text-slate-500 mt-1">
                              เขตพื้นที่การศึกษา: {s.area_name || s.Gov_Domain?.area_name}
                            </div>
                          )}
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <div className="text-2xl font-extrabold text-tm-blue">
                              {score.toFixed(2)}
                              <span className="text-sm text-slate-400 font-semibold"> / 5.00</span>
                            </div>
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
                        <div className="text-xs text-slate-500">ลงพื้นที่ล่าสุด — ยังไม่ระบุ</div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/schools/${s.school_id}`}
                            className="ed-btn ed-btn--outline ed-btn--sm"
                          >
                            ดูข้อมูลโรงเรียน
                          </Link>
                          <Link
                            href={`/calendar/new?school_id=${encodeURIComponent(String(s.school_id))}`}
                            className="ed-btn ed-btn--primary ed-btn--sm"
                          >
                            เตรียมลงพื้นที่
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
