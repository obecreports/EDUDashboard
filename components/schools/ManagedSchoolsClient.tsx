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
import { schoolCoverImage } from '@/lib/schools/images';
import { DEV_STATUS, STRATEGY_LABELS, statusFromScore, type DevStatusKey } from '@/lib/theme/status';
import { THREE_PILLAR_LABELS } from '@/lib/mock/pillars';

type VisitFilter = 'all' | 'never' | 'planned' | 'visited';
type ScoreMode = 'five' | 'three';
type SortKey =
  | 'score-asc'
  | 'score-desc'
  | 'name'
  | 'activity'
  | 'g01'
  | 'g02'
  | 'g03'
  | 'g04'
  | 'g05'
  | 'p1'
  | 'p2'
  | 'p3';

type Props = {
  schools: SchoolFull[];
  mode?: 'guest' | 'staff';
  /** When false, hide all score UI (guest / out of score policy) */
  showScores?: boolean;
  /** School ids the user can fully access (optional badge) */
  inScopeIds?: string[];
  staffName?: string;
  initialQuery?: string;
  /** Dashboard: only show these schools */
  scopeOnly?: boolean;
};

const PAGE_SIZE = 12;

export function ManagedSchoolsClient({
  schools,
  mode = 'guest',
  showScores = mode === 'staff',
  inScopeIds = [],
  staffName = 'อาสาสมัคร',
  initialQuery = '',
  scopeOnly = false,
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<Set<DevStatusKey | 'all'>>(new Set(['all']));
  const [visitFilter, setVisitFilter] = useState<Set<VisitFilter>>(new Set(['all']));
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [size, setSize] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<SortKey>('name');
  const [scoreMode, setScoreMode] = useState<ScoreMode>('five');
  const [page, setPage] = useState(1);
  const inScope = useMemo(() => new Set(inScopeIds), [inScopeIds]);

  /** Staff domain list is always scope-only; guest sees the provided catalog */
  const poolSchools = useMemo(() => {
    if (scopeOnly && inScope.size > 0) {
      return schools.filter((s) => inScope.has(String(s.school_id)));
    }
    return schools;
  }, [schools, scopeOnly, inScope]);

  /** Each dropdown options recalculate from the other two filters (any order) */
  const provinces = useMemo(() => {
    let list = poolSchools;
    if (district) list = list.filter((s) => s.district === district);
    if (size) list = list.filter((s) => s.school_size === size);
    return [...new Set(list.map((s) => s.province).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [poolSchools, district, size]);

  const districts = useMemo(() => {
    let list = poolSchools;
    if (province) list = list.filter((s) => s.province === province);
    if (size) list = list.filter((s) => s.school_size === size);
    return [...new Set(list.map((s) => s.district).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [poolSchools, province, size]);

  const sizes = useMemo(() => {
    let list = poolSchools;
    if (province) list = list.filter((s) => s.province === province);
    if (district) list = list.filter((s) => s.district === district);
    return [...new Set(list.map((s) => s.school_size).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [poolSchools, province, district]);

  const counts = useMemo(() => {
    const c: Record<DevStatusKey | 'all', number> = {
      all: poolSchools.length,
      urgent: 0,
      accelerate: 0,
      progressing: 0,
      strong: 0,
    };
    poolSchools.forEach((s) => {
      c[statusFromScore(s.overallScore).key] += 1;
    });
    return c;
  }, [poolSchools]);

  const filtered = useMemo(() => {
    let list = [...poolSchools];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.school_name_th?.toLowerCase().includes(needle) ||
          s.province?.toLowerCase().includes(needle) ||
          s.district?.toLowerCase().includes(needle) ||
          String(s.school_id).includes(needle)
      );
    }
    if (showScores && !statusFilter.has('all')) {
      list = list.filter((s) => statusFilter.has(statusFromScore(s.overallScore).key));
    }
    if (!visitFilter.has('all')) {
      list = list.filter((s) => visitFilter.has((s.visitStatus ?? 'never') as VisitFilter));
    }
    if (province) list = list.filter((s) => s.province === province);
    if (district) list = list.filter((s) => s.district === district);
    if (size) list = list.filter((s) => s.school_size === size);

    list.sort((a, b) => {
      if (sort === 'name') return (a.school_name_th || '').localeCompare(b.school_name_th || '', 'th');
      if (sort === 'activity') {
        return (b.lastActivityAt || '').localeCompare(a.lastActivityAt || '');
      }
      const scoreOf = (s: SchoolFull) => {
        if (sort === 'g01') return s.pillarScores?.learner ?? 0;
        if (sort === 'g02') return s.pillarScores?.participation ?? 0;
        if (sort === 'g03') return s.pillarScores?.teacherAdmin ?? 0;
        if (sort === 'g04') return s.pillarScores?.curriculum ?? 0;
        if (sort === 'g05') return s.pillarScores?.infrastructure ?? 0;
        if (sort === 'p1') return s.threePillarScores?.qualitySchool ?? 0;
        if (sort === 'p2') return s.threePillarScores?.qualityGraduation ?? 0;
        if (sort === 'p3') return s.threePillarScores?.disciplineMorality ?? 0;
        if (scoreMode === 'three') return s.threePillarScores?.overall ?? 0;
        return s.overallScore ?? 0;
      };
      const sa = scoreOf(a);
      const sb = scoreOf(b);
      if (sort === 'score-asc') return sa - sb;
      return sb - sa;
    });
    return list;
  }, [
    poolSchools,
    q,
    statusFilter,
    visitFilter,
    province,
    district,
    size,
    sort,
    showScores,
    scoreMode,
  ]);

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
      setPage(1);
      return;
    }
    const next = new Set(visitFilter);
    next.delete('all');
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (next.size === 0) next.add('all');
    setVisitFilter(next);
    // Visit filters pair with last-activity ordering (calendar bookings)
    if (!next.has('all')) setSort('activity');
    setPage(1);
  };

  const reset = () => {
    setQ('');
    setStatusFilter(new Set(['all']));
    setVisitFilter(new Set(['all']));
    setProvince('');
    setDistrict('');
    setSize('');
    setPage(1);
  };

  const onProvinceChange = (value: string) => {
    setProvince(value);
    setPage(1);
    // Clear sibling filters that are no longer valid under the new selection
    const nextPool = poolSchools.filter((s) => (!value || s.province === value) && (!size || s.school_size === size));
    const nextDistricts = new Set(nextPool.map((s) => s.district).filter(Boolean));
    const nextSizes = new Set(
      poolSchools
        .filter((s) => (!value || s.province === value) && (!district || s.district === district))
        .map((s) => s.school_size)
        .filter(Boolean)
    );
    if (district && !nextDistricts.has(district)) setDistrict('');
    if (size && !nextSizes.has(size)) setSize('');
  };

  const onDistrictChange = (value: string) => {
    setDistrict(value);
    setPage(1);
    const nextProvinces = new Set(
      poolSchools
        .filter((s) => (!value || s.district === value) && (!size || s.school_size === size))
        .map((s) => s.province)
        .filter(Boolean)
    );
    const nextSizes = new Set(
      poolSchools
        .filter((s) => (!province || s.province === province) && (!value || s.district === value))
        .map((s) => s.school_size)
        .filter(Boolean)
    );
    if (province && !nextProvinces.has(province)) setProvince('');
    if (size && !nextSizes.has(size)) setSize('');
  };

  const onSizeChange = (value: string) => {
    setSize(value);
    setPage(1);
    const nextProvinces = new Set(
      poolSchools
        .filter((s) => (!value || s.school_size === value) && (!district || s.district === district))
        .map((s) => s.province)
        .filter(Boolean)
    );
    const nextDistricts = new Set(
      poolSchools
        .filter((s) => (!province || s.province === province) && (!value || s.school_size === value))
        .map((s) => s.district)
        .filter(Boolean)
    );
    if (province && !nextProvinces.has(province)) setProvince('');
    if (district && !nextDistricts.has(district)) setDistrict('');
  };

  const title = mode === 'staff' ? 'โรงเรียนภายใต้ขอบเขต' : 'โรงเรียนในโครงการทั้งหมด';
  const subtitle =
    mode === 'staff'
      ? `โรงเรียนภายใต้ขอบเขตของคุณ${staffName || 'อาสาสมัคร'} ${poolSchools.length} แห่ง`
      : `โรงเรียนในโครงการกองทุนการศึกษา ${poolSchools.length} แห่ง`;

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

            {showScores && (
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
            )}

            <div>
              <div className="text-sm font-bold mb-2">สถานะการลงพื้นที่</div>
              <p className="text-[11px] text-slate-500 m-0 mb-2">
                อิงจากนัดหมายในปฏิทิน / กิจกรรมล่าสุดของโรงเรียน
              </p>
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
                onChange={(e) => onProvinceChange(e.target.value)}
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
              อำเภอ / เขต
              <select
                className="form-input"
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
                disabled={Boolean(province) && districts.length === 0}
              >
                <option value="">ทั้งหมด{province ? ` ใน${province}` : ''}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              ขนาดโรงเรียน
              <select
                className="form-input"
                value={size}
                onChange={(e) => onSizeChange(e.target.value)}
                disabled={sizes.length === 0}
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

          <section
            className={`space-y-3 schools-list-panel ${
              showScores
                ? scoreMode === 'three'
                  ? 'schools-list-panel--three'
                  : 'schools-list-panel--five'
                : 'schools-list-panel--guest'
            }`}
          >
            <h2 className="ed-section-title m-0 text-base">
              รายชื่อโรงเรียน ({filtered.length} แห่ง)
            </h2>

            <div className="schools-list-panel__toolbar">
              {showScores && (
                <div className="score-mode-switch" role="group" aria-label="โหมดคะแนน">
                  <button
                    type="button"
                    className={scoreMode === 'five' ? 'is-active' : ''}
                    onClick={() => {
                      setScoreMode('five');
                      setSort('score-desc');
                      setPage(1);
                    }}
                  >
                    คะแนน 5 กลยุทธ์
                  </button>
                  <button
                    type="button"
                    className={scoreMode === 'three' ? 'is-active' : ''}
                    onClick={() => {
                      setScoreMode('three');
                      setSort('score-desc');
                      setPage(1);
                    }}
                  >
                    คะแนน 3 เสาหลัก
                  </button>
                </div>
              )}
              {showScores && (
                <p className="schools-list-panel__mode-hint m-0">
                  {scoreMode === 'five'
                    ? 'กำลังแสดงคะแนนตาม 5 กลยุทธ์ — พื้นหลังโทนน้ำเงิน'
                    : 'กำลังแสดงคะแนนตาม 3 เสาหลัก — พื้นหลังโทนเขียวอมฟ้า'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 schools-list-panel__head">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className={`managed-view-btn ${view === 'grid' ? 'is-current' : ''}`}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid size={14} /> การ์ด
                </button>
                <button
                  type="button"
                  className={`managed-view-btn ${view === 'list' ? 'is-current' : ''}`}
                  onClick={() => setView('list')}
                >
                  <List size={14} /> รายการ
                </button>
              </div>
              <label className="text-sm font-semibold flex items-center gap-2 ml-auto">
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
                  <option value="name">ชื่อโรงเรียน</option>
                  <option value="activity">กิจกรรมล่าสุด / ลงพื้นที่</option>
                  {showScores && (
                    <>
                      <option value="score-asc">คะแนนรวมต่ำ → สูง</option>
                      <option value="score-desc">คะแนนรวมสูง → ต่ำ</option>
                      {scoreMode === 'five' ? (
                        <>
                          <option value="g01">เรียงตามกลยุทธ์ผู้เรียน</option>
                          <option value="g02">เรียงตามการมีส่วนร่วม</option>
                          <option value="g03">เรียงตามครูและผู้บริหาร</option>
                          <option value="g04">เรียงตามหลักสูตร</option>
                          <option value="g05">เรียงตามโครงสร้างพื้นฐาน</option>
                        </>
                      ) : (
                        <>
                          <option value="p1">เรียงตาม{THREE_PILLAR_LABELS.qualitySchool}</option>
                          <option value="p2">เรียงตาม{THREE_PILLAR_LABELS.qualityGraduation}</option>
                          <option value="p3">เรียงตาม{THREE_PILLAR_LABELS.disciplineMorality}</option>
                        </>
                      )}
                    </>
                  )}
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className="ed-card p-6 text-center text-slate-500">ไม่พบโรงเรียนตามเงื่อนไข</div>
            ) : view === 'list' ? (
              <div className="ed-school-list-compact">
                {pageRows.map((s) => {
                  const displayScore =
                    scoreMode === 'three'
                      ? s.threePillarScores?.overall ?? 0
                      : s.overallScore ?? 0;
                  const st = statusFromScore(displayScore);
                  const loc = [s.district, s.province].filter(Boolean).join(' · ');
                  const gov =
                    s.area_name ||
                    s.Gov_Domain?.area_name ||
                    (s.area_id != null ? String(s.area_id) : '');
                  return (
                    <article key={String(s.school_id)} className="ed-school-list-row">
                      <div className="ed-school-list-row__main min-w-0">
                        <Link
                          href={`/schools/${s.school_id}`}
                          className="font-bold text-tm-blue hover:underline text-sm truncate"
                        >
                          {s.school_name_th}
                        </Link>
                        <div className="text-xs text-slate-500 truncate">
                          {loc || '—'}
                          {gov ? ` · ${gov}` : ''}
                          {showScores
                            ? ` · ${
                                s.visitStatus === 'visited'
                                  ? 'ลงพื้นที่แล้ว'
                                  : s.visitStatus === 'planned'
                                    ? 'นัดหมายแล้ว'
                                    : 'ยังไม่เคย'
                              }`
                            : ''}
                        </div>
                      </div>
                      {showScores ? (
                        <div className="ed-school-list-row__score">
                          <strong className="text-tm-blue">{displayScore.toFixed(1)}</strong>
                          <span className="ed-badge" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>
                      ) : null}
                      <div className="ed-school-list-row__actions">
                        <Link
                          href={`/schools/${s.school_id}`}
                          className="ed-btn ed-btn--outline ed-btn--sm"
                        >
                          ดูข้อมูล
                        </Link>
                        {showScores ? (
                          <Link
                            href={`/calendar/new?school_id=${encodeURIComponent(String(s.school_id))}`}
                            className="ed-btn ed-btn--primary ed-btn--sm"
                          >
                            เตรียมลงพื้นที่
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ed-school-grid ed-school-grid--3">
                {pageRows.map((s) => {
                  const cover = schoolCoverImage(s);
                  const displayScore =
                    scoreMode === 'three'
                      ? s.threePillarScores?.overall ?? 0
                      : s.overallScore ?? 0;
                  const st = statusFromScore(displayScore);
                  const loc = [s.district, s.province].filter(Boolean).join(' • ');
                  const gov =
                    s.area_name ||
                    s.Gov_Domain?.area_name ||
                    (s.area_id != null ? String(s.area_id) : '');
                  return (
                    <article
                      key={String(s.school_id)}
                      className="ed-card ed-school-card overflow-hidden"
                    >
                      <div
                        className="ed-school-card__cover"
                        style={{
                          backgroundImage: `linear-gradient(160deg, rgba(15,23,42,0.25) 0%, transparent 55%), url(${cover})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
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
                          {gov ? (
                            <div className="text-xs text-slate-500 mt-1">
                              เขตพื้นที่การศึกษา: {gov}
                            </div>
                          ) : null}
                        </div>
                        {showScores ? (
                          <>
                            <div className="flex items-end justify-between gap-2">
                              <div className="text-2xl font-extrabold text-tm-blue">
                                {displayScore.toFixed(1)}
                                <span className="text-sm text-slate-400 font-semibold">
                                  {scoreMode === 'three' ? ' / 100' : ' / 5.00'}
                                </span>
                              </div>
                              <span className="ed-badge" style={{ background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            </div>
                            {scoreMode === 'five' ? (
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
                            ) : (
                              <div className="ed-mini-pillars ed-mini-pillars--three">
                                <div>
                                  <div className="text-[10px] font-bold text-sky-700">P1</div>
                                  <div className="text-xs font-semibold">
                                    {(s.threePillarScores?.qualitySchool ?? 0).toFixed(1)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-emerald-700">P2</div>
                                  <div className="text-xs font-semibold">
                                    {(s.threePillarScores?.qualityGraduation ?? 0).toFixed(1)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-orange-700">P3</div>
                                  <div className="text-xs font-semibold">
                                    {(s.threePillarScores?.disciplineMorality ?? 0).toFixed(1)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">ข้อมูลพื้นฐานโรงเรียน (ไม่แสดงคะแนน)</p>
                        )}
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            กิจกรรมล่าสุด:{' '}
                            {s.lastActivityAt
                              ? new Date(s.lastActivityAt).toLocaleDateString('th-TH')
                              : '—'}
                          </span>
                          <span>
                            ลงพื้นที่:{' '}
                            {s.visitStatus === 'visited'
                              ? 'ลงพื้นที่แล้ว'
                              : s.visitStatus === 'planned'
                                ? 'นัดหมายแล้ว'
                                : 'ยังไม่เคย'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/schools/${s.school_id}`}
                            className="ed-btn ed-btn--outline ed-btn--sm"
                          >
                            ดูข้อมูลโรงเรียน
                          </Link>
                          {showScores ? (
                            <Link
                              href={`/calendar/new?school_id=${encodeURIComponent(String(s.school_id))}`}
                              className="ed-btn ed-btn--primary ed-btn--sm"
                            >
                              เตรียมลงพื้นที่
                            </Link>
                          ) : null}
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
                <div className="managed-pagination__btns">
                  <button
                    type="button"
                    className="managed-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => {
                      // Window around current page (avoid false “active” on domain cards)
                      if (totalPages <= 5) return true;
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      return n >= start && n < start + 5;
                    })
                    .map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`managed-page-btn ${page === n ? 'is-current' : ''}`}
                        aria-current={page === n ? 'page' : undefined}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="managed-page-btn"
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
