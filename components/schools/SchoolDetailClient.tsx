'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Award,
  ClipboardPen,
  Expand,
  Home,
  Info,
  Map as MapIcon,
  MessageSquare,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { SchoolFull } from '@/lib/types';
import type {
  SchoolAchievements,
  SchoolComment,
  SchoolSwot,
} from '@/lib/auth/user-store';
import { postSchoolCommentAction } from '@/app/actions/school-extras';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type TabId = 'overview' | 'basic' | 'people' | 'scores';

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function labelOf(
  lookup: Record<string, string> | undefined,
  code: string,
  fallback: string
) {
  return lookup?.[code] || lookup?.[code.replace(/_score$/, '')] || fallback;
}

function scoreColor(score: number) {
  if (score >= 4) return '#059669';
  if (score >= 3) return '#65a30d';
  if (score >= 2) return '#d97706';
  return '#ea580c';
}

function qualityLabel(score: number) {
  if (score >= 4) return 'ดีเยี่ยม';
  if (score >= 3) return 'ดี';
  if (score >= 2) return 'พอใช้';
  return 'ต้องปรับปรุง';
}

type LevelRow = { code: string; name: string; boy: number; girl: number; sum: number };

function level(
  people: Record<string, unknown>,
  lookup: Record<string, string> | undefined,
  prefix: string,
  fallbackName: string
): LevelRow {
  const boy = num(people[`${prefix}_boy`]);
  const girl = num(people[`${prefix}_girl`]);
  let sum = num(people[`${prefix}_sum`]);
  if (sum <= 0) {
    const alt = Object.keys(people).find(
      (k) =>
        k.startsWith(prefix) &&
        /_(sum|all|girl_1|boy_1)$/i.test(k) &&
        !k.endsWith('_boy') &&
        !k.endsWith('_girl')
    );
    if (alt) sum = num(people[alt]);
  }
  if (sum <= 0) sum = boy + girl;
  return {
    code: prefix,
    name: labelOf(lookup, prefix, fallbackName),
    boy,
    girl,
    sum,
  };
}

function MiniMap({
  lat,
  lng,
  name,
  className,
}: {
  lat: number;
  lng: number;
  name: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [lng, lat],
      zoom: 13,
      interactive: true,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    new maplibregl.Marker({ color: '#29568f' })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ offset: 16 }).setText(name))
      .addTo(map);
    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, name]);

  useEffect(() => {
    // Resize after fullscreen toggle / layout settle
    const t = window.setTimeout(() => mapRef.current?.resize(), 80);
    return () => window.clearTimeout(t);
  }, [className]);

  return <div ref={ref} className={className || 'school-mini-map'} />;
}

function ScoreBar({
  label,
  code,
  score,
  showCode = true,
}: {
  label: string;
  code?: string;
  score: number;
  showCode?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <div className="score-bar-row">
      <div
        className="score-bar-meta"
        style={{ gridTemplateColumns: showCode && code ? 'auto 1fr auto' : '1fr auto' }}
      >
        {showCode && code ? <span className="score-bar-code">{code}</span> : null}
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color: scoreColor(score) }}>
          {score.toFixed(2)}
        </span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, background: scoreColor(score) }}
        />
      </div>
    </div>
  );
}

function OverallGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  const color = scoreColor(score);
  return (
    <div className="overall-gauge">
      <div
        className="overall-gauge__ring"
        style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, #e2e8f0 0deg)` }}
      >
        <div className="overall-gauge__inner">
          <div className="overall-gauge__score" style={{ color }}>
            {score.toFixed(2)}
          </div>
          <div className="overall-gauge__label">{qualityLabel(score)}</div>
        </div>
      </div>
      <p className="text-sm text-slate-500 m-0 text-center">คะแนนรวม · เต็ม 5</p>
    </div>
  );
}

import {
  SWOT_EXTERNAL_FIELDS,
  SWOT_INTERNAL_FIELDS,
} from '@/lib/swot/schema';

export function SchoolDetailClient({
  school,
  canEdit,
  canViewComments = false,
  canComment,
  initialComments,
  initialSwot,
  initialAchievements,
}: {
  school: SchoolFull;
  canEdit: boolean;
  canViewComments?: boolean;
  canComment: boolean;
  initialComments: SchoolComment[];
  initialSwot: SchoolSwot;
  initialAchievements: SchoolAchievements;
}) {
  const [tab, setTab] = useState<TabId>('overview');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const people = (school.School_People ?? {}) as Record<string, unknown>;
  const scores = (school.School_Score ?? school.scores ?? {}) as Record<string, unknown>;
  const lookup = school.labelLookup ?? {};

  const lat = Number(school.latitude);
  const lng = Number(school.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  const address = [
    school.moo ? `หมู่ ${school.moo}` : '',
    school.village_name ? `บ้าน${school.village_name}` : '',
    school.subdistrict ? `ต.${school.subdistrict}` : '',
    school.district ? `อ.${school.district}` : '',
    school.province ? `จ.${school.province}` : '',
    school.zipcode ? String(school.zipcode) : '',
  ]
    .filter(Boolean)
    .join(' ');

  const areaName = school.area_name || school.Gov_Domain?.area_name || '';

  const groups = useMemo(() => {
    const kinder = [
      level(people, lookup, 'kinder_1', 'อนุบาล 1'),
      level(people, lookup, 'kinder_2', 'อนุบาล 2'),
      level(people, lookup, 'kinder_3', 'อนุบาล 3'),
    ].filter((l) => l.sum > 0);
    const primary = [1, 2, 3, 4, 5, 6]
      .map((n) => level(people, lookup, `primary_${n}`, `ประถมศึกษาปีที่ ${n}`))
      .filter((l) => l.sum > 0);
    const middle = [1, 2, 3]
      .map((n) => level(people, lookup, `middle_${n}`, `มัธยมศึกษาปีที่ ${n}`))
      .filter((l) => l.sum > 0);
    const high = [4, 5, 6]
      .map((n) => level(people, lookup, `highschool_${n}`, `มัธยมศึกษาปีที่ ${n}`))
      .filter((l) => l.sum > 0);
    const voca = [1, 2, 3]
      .map((n) => level(people, lookup, `Voca_${n}`, `ปวช. ${n}`))
      .filter((l) => l.sum > 0);

    const pack = (
      key: string,
      title: string,
      totalKey: string | null,
      levels: LevelRow[],
      shortLabel: string
    ) => {
      const rawTotal = totalKey ? num(people[totalKey]) : 0;
      const total = rawTotal > 0 ? rawTotal : levels.reduce((s, l) => s + l.sum, 0);
      return { key, title, shortLabel, total, levels };
    };

    return [
      pack('kinder', labelOf(lookup, 'kinder_all_sum', 'ระดับอนุบาล'), 'kinder_all_sum', kinder, 'อนุบาล'),
      pack('primary', labelOf(lookup, 'primary_all_sum', 'ระดับประถมศึกษา'), 'primary_all_sum', primary, 'ประถม'),
      pack('middle', 'ระดับมัธยมต้น', null, middle, 'มัธยมต้น'),
      pack('high', 'ระดับมัธยมปลาย', null, high, 'มัธยมปลาย'),
      pack('voca', labelOf(lookup, 'Voca_all_sum', 'ระดับอาชีวศึกษา'), 'Voca_all_sum', voca, 'ปวช.'),
    ].filter((g) => g.levels.length > 0 || g.total > 0);
  }, [people, lookup]);

  const offeredLevels = useMemo(() => {
    const labels: string[] = [];
    if (groups.some((g) => g.key === 'kinder')) labels.push('อนุบาล');
    if (groups.some((g) => g.key === 'primary')) labels.push('ประถมศึกษา');
    if (groups.some((g) => g.key === 'middle' || g.key === 'high')) labels.push('มัธยมศึกษา');
    if (groups.some((g) => g.key === 'voca')) labels.push('อาชีวศึกษา / ปวช.');
    return labels;
  }, [groups]);

  const totalStudents = num(people.sum_student) || groups.reduce((s, g) => s + g.total, 0);
  const totalTeachers = num(people.actual_teacher);
  const teacherDirector = num(people.teacher_director);
  const activeLevels = groups.flatMap((g) => g.levels);
  const totalBoys = activeLevels.reduce((s, l) => s + l.boy, 0);
  const totalGirls = activeLevels.reduce((s, l) => s + l.girl, 0);

  const gScores = [
    { code: 'G01', fallback: 'ด้านผู้เรียน', value: num(scores.G01) },
    { code: 'G02', fallback: 'ด้านการมีส่วนร่วม', value: num(scores.G02) },
    { code: 'G03', fallback: 'ด้านผู้สอนและผู้บริหาร', value: num(scores.G03) },
    { code: 'G04', fallback: 'ด้านหลักสูตรและการสอน', value: num(scores.G04) },
    { code: 'G05', fallback: 'ด้านโครงสร้างพื้นฐาน', value: num(scores.G05) },
  ].map((g) => ({
    ...g,
    label: labelOf(lookup, g.code, labelOf(lookup, `${g.code}_score`, g.fallback)),
  }));

  const indicatorGroups = [
    { prefix: 'S', title: 'ตัวชี้วัดโรงเรียน', max: 12 },
    { prefix: 'M', title: 'ตัวชี้วัดการบริหารจัดการ', max: 5 },
    { prefix: 'H', title: 'ตัวชี้วัดครู / ผู้บริหาร', max: 20 },
    { prefix: 'C', title: 'ตัวชี้วัดนักเรียน', max: 5 },
    { prefix: 'D', title: 'ตัวชี้วัดดิจิทัลและการเรียนรู้', max: 8 },
  ].map((grp) => {
    const rows: { code: string; label: string; score: number }[] = [];
    for (let i = 1; i <= grp.max; i++) {
      const code = `${grp.prefix}${String(i).padStart(2, '0')}`;
      const key = `${code}_score`;
      rows.push({
        code,
        label: labelOf(lookup, key, labelOf(lookup, code, code)),
        score: num(scores[key] ?? scores[code]),
      });
    }
    return { ...grp, rows };
  });

  const overall = num(scores.overall) || school.overallScore || 0;

  const barData = useMemo(() => {
    const labels = activeLevels.map((l) => l.name.replace(/^จำนวนนักเรียน\s*/u, '').slice(0, 22));
    return {
      labels,
      datasets: [
        {
          label: 'ชาย',
          data: activeLevels.map((l) => l.boy),
          backgroundColor: '#29568f',
          borderRadius: 4,
          stack: 'gender',
        },
        {
          label: 'หญิง',
          data: activeLevels.map((l) => l.girl),
          backgroundColor: '#00c6a0',
          borderRadius: 4,
          stack: 'gender',
        },
      ],
    };
  }, [activeLevels]);

  const levelDonut = useMemo(() => {
    const buckets = [
      { label: 'อนุบาล', value: groups.find((g) => g.key === 'kinder')?.total ?? 0 },
      { label: 'ประถม', value: groups.find((g) => g.key === 'primary')?.total ?? 0 },
      {
        label: 'มัธยม',
        value:
          (groups.find((g) => g.key === 'middle')?.total ?? 0) +
          (groups.find((g) => g.key === 'high')?.total ?? 0),
      },
      { label: 'ปวช.', value: groups.find((g) => g.key === 'voca')?.total ?? 0 },
    ].filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          data: buckets.map((b) => b.value),
          backgroundColor: ['#38bdf8', '#29568f', '#00c6a0', '#f59e0b'],
          borderWidth: 0,
        },
      ],
    };
  }, [groups]);

  const genderDonut = useMemo(
    () => ({
      labels: ['ชาย', 'หญิง'],
      datasets: [
        {
          data: [totalBoys, totalGirls],
          backgroundColor: ['#29568f', '#00c6a0'],
          borderWidth: 0,
        },
      ],
    }),
    [totalBoys, totalGirls]
  );

  const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
    { id: 'overview', label: 'ภาพรวม', icon: Home },
    { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: Info },
    { id: 'people', label: 'นักเรียน / บุคลากร', icon: Users },
    { id: 'scores', label: 'ผลการประเมิน', icon: Award },
  ];

  const mapBlock = hasCoords ? (
    <div className="school-map-card panel-card p-0 overflow-hidden">
      <div className="school-map-card__head">
        <div className="flex items-center gap-2 text-sm font-semibold text-tm-blue">
          <MapIcon size={16} />
          ตำแหน่งโรงเรียน
        </div>
        <button
          type="button"
          className="navbar__link text-xs"
          onClick={() => setMapFullscreen(true)}
        >
          <Expand size={14} />
          ขยายเต็มจอ
        </button>
      </div>
      <div className="school-map-card__body">
        <MiniMap lat={lat} lng={lng} name={school.school_name_th} />
        <div className="school-map-card__info">
          <h3 className="font-bold text-tm-blue m-0 text-base">{school.school_name_th}</h3>
          <p className="text-sm text-slate-600 m-0 mt-2">{address || '—'}</p>
          {areaName && (
            <p className="text-sm m-0 mt-2">
              <span className="text-slate-500">เขตพื้นที่การศึกษา:</span>{' '}
              <strong>{areaName}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="school-detail">
      <nav className="school-detail__crumbs" aria-label="breadcrumb">
        <Link href="/schools" prefetch className="text-tm-blue hover:underline">
          รายชื่อโรงเรียน
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/thailand-map" prefetch className="text-tm-blue hover:underline">
          แผนที่
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 truncate">{school.school_name_th}</span>
        {canEdit && (
          <>
            <span className="text-slate-300">·</span>
            <Link
              href={`/staff/update-school?id=${school.school_id}`}
              prefetch
              className="text-tm-blue hover:underline inline-flex items-center gap-1"
            >
              <ClipboardPen size={14} />
              อัปเดตข้อมูล
            </Link>
          </>
        )}
      </nav>

      <header className="school-detail__banner">
        <p className="school-detail__banner-id">รหัสโรงเรียน {school.school_id}</p>
        <h1 className="school-detail__banner-name">{school.school_name_th}</h1>
        <div className="school-detail__banner-meta">
          <span>{school.province || '—'}</span>
          {areaName ? (
            <>
              <span className="school-detail__banner-dot" aria-hidden>
                ·
              </span>
              <span>{areaName}</span>
            </>
          ) : null}
        </div>
      </header>

      <div className="school-detail__tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`school-tab ${active ? 'school-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="kpi-grid">
            <article className="kpi-card">
              <div className="kpi-card__icon">
                <Users size={22} />
              </div>
              <div>
                <div className="kpi-card__label">นักเรียนทั้งหมด</div>
                <div className="kpi-card__value">{totalStudents.toLocaleString()}</div>
                <div className="kpi-card__hint">
                  ชาย {totalBoys.toLocaleString()} · หญิง {totalGirls.toLocaleString()}
                </div>
              </div>
            </article>
            <article className="kpi-card">
              <div className="kpi-card__icon kpi-card__icon--seafoam">
                <UserCheck size={22} />
              </div>
              <div>
                <div className="kpi-card__label">บุคลากรทั้งหมด</div>
                <div className="kpi-card__value">{totalTeachers.toLocaleString()}</div>
                <div className="kpi-card__hint">ผู้อำนวยการ: {teacherDirector.toLocaleString()}</div>
              </div>
            </article>
            <article className="kpi-card">
              <div className="kpi-card__icon">
                <Award size={22} />
              </div>
              <div>
                <div className="kpi-card__label">คะแนนรวม</div>
                <div className="kpi-card__value" style={{ color: scoreColor(overall) }}>
                  {overall.toFixed(2)}
                </div>
                <div className="kpi-card__hint">{qualityLabel(overall)}</div>
              </div>
            </article>
          </div>

          {school.area_special && (
            <div className="panel-card flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">พื้นที่พิเศษ:</span>
              <span className="school-chip school-chip--amber">{school.area_special}</span>
            </div>
          )}

          <div className="panel-card">
            <h2 className="section-heading text-base">ระดับชั้นที่เปิดสอน</h2>
            {offeredLevels.length === 0 ? (
              <p className="text-sm text-slate-500 m-0">ยังไม่มีข้อมูลจำนวนนักเรียนรายระดับ</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {offeredLevels.map((lv) => (
                  <span key={lv} className="school-chip">
                    {lv}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
          >
            <div className="panel-card">
              <OverallGauge score={overall} />
            </div>
            <div className="panel-card space-y-3">
              <h2 className="section-heading text-base m-0">กลุ่มผลการประเมิน</h2>
              {gScores.map((g) => (
                <ScoreBar key={g.code} label={g.label} score={g.value} showCode={false} />
              ))}
            </div>
          </div>

          {mapBlock}

          {canViewComments && (
            <section className="panel-card space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-tm-blue" />
                <h2 className="section-heading text-base m-0">ความคิดเห็นและบันทึกติดตาม</h2>
              </div>
              {canComment ? (
                <form
                  className="space-y-2"
                  action={(fd) => {
                    setMsg(null);
                    start(async () => {
                      fd.set('school_id', String(school.school_id));
                      fd.set('text', commentText);
                      const res = await postSchoolCommentAction(fd);
                      if (!res.ok) {
                        setMsg(('error' in res && res.error) || 'บันทึกไม่สำเร็จ');
                        return;
                      }
                      if ('comment' in res && res.comment) {
                        setComments((prev) => [res.comment, ...prev]);
                        setCommentText('');
                        setMsg('บันทึกความคิดเห็นแล้ว');
                      }
                    });
                  }}
                >
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="บันทึกการเยี่ยม / ความคิดเห็นติดตาม…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="navbar__login"
                    disabled={pending || !commentText.trim()}
                  >
                    {pending ? 'กำลังบันทึก…' : 'โพสต์บันทึก'}
                  </button>
                </form>
              ) : null}
              {msg && <p className="text-sm text-tm-blue m-0">{msg}</p>}
              {comments.length === 0 ? (
                <p className="school-empty-note m-0">ยังไม่มีความเห็นของโรงเรียนนี้</p>
              ) : (
                <ul className="m-0 p-0 list-none space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                      <div className="flex justify-between gap-2 text-xs text-slate-500 mb-1">
                        <strong className="text-tm-blue">{c.staff_name}</strong>
                        <span>{new Date(c.created_at).toLocaleString('th-TH')}</span>
                      </div>
                      <div>{c.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="panel-card space-y-5">
            <h2 className="section-heading text-base">การวิเคราะห์สภาพแวดล้อม — SWOT</h2>
            <div className="prose-stack">
              <h3 className="prose-stack__group">สภาพแวดล้อมภายใน</h3>
              {SWOT_INTERNAL_FIELDS.map((f) => (
                <div key={f.key} className="prose-stack__item">
                  <h4 className="prose-stack__title">{f.label}</h4>
                  <p className="prose-stack__body">
                    <strong>จุดแข็ง:</strong>{' '}
                    {initialSwot.internal[f.key]?.strengths?.trim() || '—'}
                  </p>
                  <p className="prose-stack__body">
                    <strong>จุดอ่อน:</strong>{' '}
                    {initialSwot.internal[f.key]?.weaknesses?.trim() || '—'}
                  </p>
                </div>
              ))}
            </div>
            <div className="prose-stack">
              <h3 className="prose-stack__group">สภาพแวดล้อมภายนอก</h3>
              {SWOT_EXTERNAL_FIELDS.map((f) => (
                <div key={f.key} className="prose-stack__item">
                  <h4 className="prose-stack__title">{f.label}</h4>
                  <p className="prose-stack__body">
                    <strong>จุดแข็ง:</strong>{' '}
                    {initialSwot.external[f.key]?.strengths?.trim() || '—'}
                  </p>
                  <p className="prose-stack__body">
                    <strong>จุดอ่อน:</strong>{' '}
                    {initialSwot.external[f.key]?.weaknesses?.trim() || '—'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'basic' && (
        <div className="space-y-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            <div className="panel-card space-y-3">
              <h2 className="section-heading text-base">ข้อมูลโรงเรียน</h2>
              <dl className="detail-dl">
                <div><dt>ชื่อโรงเรียน</dt><dd>{school.school_name_th || '—'}</dd></div>
                <div><dt>รหัสโรงเรียน</dt><dd>{school.school_id}</dd></div>
                <div><dt>โทรศัพท์</dt><dd>{school.phone || '—'}</dd></div>
                <div><dt>หมู่</dt><dd>{school.moo || '—'}</dd></div>
                <div><dt>หมู่บ้าน</dt><dd>{school.village_name || '—'}</dd></div>
                <div><dt>ตำบล</dt><dd>{school.subdistrict || '—'}</dd></div>
                <div><dt>อำเภอ</dt><dd>{school.district || '—'}</dd></div>
                <div><dt>จังหวัด</dt><dd>{school.province || '—'}</dd></div>
                <div><dt>รหัสไปรษณีย์</dt><dd>{school.zipcode || '—'}</dd></div>
                <div><dt>ขนาดโรงเรียน</dt><dd>{school.school_size || '—'}</dd></div>
                <div><dt>ภาค</dt><dd>{school.zone || '—'}</dd></div>
              </dl>
            </div>
            <div className="panel-card space-y-3 school-loc-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="section-heading text-base m-0">ตำแหน่งโรงเรียน</h2>
                {hasCoords && (
                  <button
                    type="button"
                    className="navbar__link text-xs"
                    onClick={() => setMapFullscreen(true)}
                  >
                    <Expand size={14} />
                    ขยายเต็มจอ
                  </button>
                )}
              </div>
              <dl className="detail-dl">
                <div><dt>เขตพื้นที่การศึกษา</dt><dd>{areaName || '—'}</dd></div>
                <div><dt>ที่อยู่</dt><dd>{address || '—'}</dd></div>
              </dl>
              {hasCoords && (
                <MiniMap
                  lat={lat}
                  lng={lng}
                  name={school.school_name_th}
                  className="school-mini-map school-mini-map--sm"
                />
              )}
            </div>
          </div>

          <section className="panel-card space-y-5">
            <h2 className="section-heading text-base">ผลงานสถานศึกษา</h2>
            <div className="prose-stack">
              <div className="prose-stack__item">
                <h4 className="prose-stack__title">ผลงานและความสำเร็จของสถานศึกษา</h4>
                <p className="prose-stack__body">
                  {initialAchievements.school?.trim() || '—'}
                </p>
              </div>
              <div className="prose-stack__item">
                <h4 className="prose-stack__title">ผลงานและความสำเร็จของนักเรียน</h4>
                <p className="prose-stack__body">
                  {initialAchievements.student?.trim() || '—'}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'people' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="section-heading text-base">บุคลากร</h2>
            <div className="kpi-grid">
              <article className="kpi-card">
                <div>
                  <div className="kpi-card__label">ครู</div>
                  <div className="kpi-card__value">{totalTeachers.toLocaleString()}</div>
                </div>
              </article>
              <article className="kpi-card">
                <div>
                  <div className="kpi-card__label">ผู้อำนวยการ</div>
                  <div className="kpi-card__value">{teacherDirector.toLocaleString()}</div>
                </div>
              </article>
              <article className="kpi-card">
                <div>
                  <div className="kpi-card__label">รวมบุคลากร</div>
                  <div className="kpi-card__value">
                    {(totalTeachers + teacherDirector).toLocaleString()}
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="section-heading text-base">นักเรียน</h2>
            <div className="kpi-grid">
              <article className="kpi-card">
                <div>
                  <div className="kpi-card__label">รวมนักเรียน</div>
                  <div className="kpi-card__value">{totalStudents.toLocaleString()}</div>
                </div>
              </article>
              <article className="kpi-card">
                <div>
                  <div className="kpi-card__label">ชาย / หญิง</div>
                  <div className="kpi-card__value text-base" style={{ fontSize: '1.35rem' }}>
                    {totalBoys.toLocaleString()} / {totalGirls.toLocaleString()}
                  </div>
                </div>
              </article>
            </div>

            <div className="panel-card">
              <h3 className="font-bold text-tm-blue text-sm mb-3">จำนวนนักเรียนตามชั้น (ชาย/หญิง)</h3>
              <div className="school-bar-full">
                {activeLevels.length > 0 ? (
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                      },
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-400">ไม่มีข้อมูลชั้นที่มีนักเรียน</p>
                )}
              </div>
            </div>

            <div className="school-donut-row">
              <div className="panel-card">
                <h3 className="font-bold text-tm-blue text-sm mb-3">สัดส่วนระดับชั้น</h3>
                <div className="school-donut-frame">
                  {levelDonut.labels.length > 0 ? (
                    <Doughnut
                      data={levelDonut}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  ) : (
                    <p className="text-sm text-slate-400">ไม่มีข้อมูล</p>
                  )}
                </div>
              </div>
              <div className="panel-card">
                <h3 className="font-bold text-tm-blue text-sm mb-3">สัดส่วนเพศ</h3>
                <div className="school-donut-frame">
                  {totalBoys + totalGirls > 0 ? (
                    <Doughnut
                      data={genderDonut}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  ) : (
                    <p className="text-sm text-slate-400">ไม่มีข้อมูล</p>
                  )}
                </div>
              </div>
            </div>

            {groups.map((g) => (
              <section key={g.key} className="panel-card p-0 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-tm-blue m-0 text-sm">{g.title}</h3>
                  <span className="text-sm font-semibold text-slate-600">
                    รวม {g.total.toLocaleString()} คน
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}>
                      <tr>
                        <th className="text-left p-3">ชั้น</th>
                        <th className="text-right p-3">ชาย</th>
                        <th className="text-right p-3">หญิง</th>
                        <th className="text-right p-3">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.levels.map((l) => (
                        <tr key={l.code} className="border-t border-slate-100">
                          <td className="p-3">{l.name}</td>
                          <td className="p-3 text-right">{l.boy.toLocaleString()}</td>
                          <td className="p-3 text-right">{l.girl.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold">{l.sum.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </section>
        </div>
      )}

      {tab === 'scores' && (
        <div className="space-y-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            <div className="panel-card">
              <OverallGauge score={overall} />
            </div>
            <div className="panel-card">
              <h2 className="section-heading text-base">เปรียบเทียบกับค่าเฉลี่ยประเทศ</h2>
              <DualRadarChart
                labels={gScores.map((g) => g.label.replace(/^ด้าน/, ''))}
                schoolScores={gScores.map((g) => g.value)}
              />
            </div>
          </div>

          <div className="panel-card space-y-3">
            <h2 className="section-heading text-base m-0">กลุ่มผลการประเมิน</h2>
            <div className="score-grid-2">
              {gScores.map((g) => (
                <ScoreBar key={g.code} label={g.label} score={g.value} showCode={false} />
              ))}
            </div>
          </div>

          {indicatorGroups.map((grp) => (
            <section key={grp.prefix} className="panel-card space-y-3">
              <h2 className="section-heading text-base m-0">{grp.title}</h2>
              <div className="score-grid-2">
                {grp.rows.map((r) => (
                  <ScoreBar key={r.code} code={r.code} label={r.label} score={r.score} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {mapFullscreen && hasCoords && (
        <div className="map-fs-overlay" role="dialog" aria-modal="true" aria-label="แผนที่เต็มจอ">
          <div className="map-fs-overlay__bar">
            <div>
              <strong>{school.school_name_th}</strong>
              <div className="text-xs opacity-80">{areaName || address}</div>
            </div>
            <button
              type="button"
              className="navbar__login"
              onClick={() => setMapFullscreen(false)}
            >
              <X size={16} />
              ปิด
            </button>
          </div>
          <MiniMap
            lat={lat}
            lng={lng}
            name={school.school_name_th}
            className="school-mini-map school-mini-map--fs"
          />
        </div>
      )}
    </div>
  );
}
