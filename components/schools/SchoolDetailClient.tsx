'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardPen,
  Expand,
  FilePlus2,
  Home,
  Info,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  Sparkles,
  Star,
  TriangleAlert,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import type { SchoolFull, ThreePillarScores } from '@/lib/types';
import { DIRECTOR_TBA_LABEL, directorDisplayLabel } from '@/lib/types';
import { directorPictureUrl, schoolCoverImage } from '@/lib/schools/images';
import { ImageThumbGrid } from '@/components/media/ImageThumbGrid';
import type {
  SchoolAchievements,
  SchoolComment,
  SchoolSwot,
} from '@/lib/auth/user-store';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';
import { THREE_PILLAR_INDICATOR_DEFS, THREE_PILLAR_LABELS } from '@/lib/mock/pillars';
import {
  formatThaiDate,
  formatThaiDateWithWeekday,
  formatThaiTime,
} from '@/lib/format/date';
import {
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
  scoreYearToBeLabel,
} from '@/lib/scores/years';
import { statusFromScore } from '@/lib/theme/status';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type TabId =
  | 'overview'
  | 'basic'
  | 'people'
  | 'location'
  | 'swot'
  | 'visits'
  | 'scores'
  | 'pillars';

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
  return statusFromScore(score).color;
}

function qualityLabel(score: number) {
  return statusFromScore(score).label;
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

function fmtScore(score: number, max: number) {
  return max > 5 ? score.toFixed(1) : score.toFixed(2);
}

function OverallGauge({
  score,
  max = 5,
  prevScore,
  currLabel,
  prevLabel,
}: {
  score: number;
  max?: number;
  prevScore?: number | null;
  currLabel?: string;
  prevLabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, (score / Math.max(1, max)) * 100));
  const color = scoreColor(score);
  const hasPrev = prevScore != null && Number.isFinite(prevScore);
  const delta = hasPrev ? score - (prevScore as number) : 0;
  return (
    <div className="overall-gauge">
      <div
        className="overall-gauge__ring"
        style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, #e2e8f0 0deg)` }}
      >
        <div className="overall-gauge__inner">
          <div className="overall-gauge__score" style={{ color }}>
            {fmtScore(score, max)}
          </div>
          <div className="overall-gauge__label">{qualityLabel(score)}</div>
        </div>
      </div>
      <p className="text-sm text-slate-500 m-0 text-center">
        {currLabel ? `ปี ${currLabel} · ` : ''}คะแนนรวม · เต็ม {max}
      </p>
      {hasPrev && currLabel && prevLabel ? (
        <div className="overall-gauge__yoy">
          <div className="overall-gauge__yoy-row">
            <span>ปี {prevLabel}</span>
            <strong>{fmtScore(prevScore as number, max)}</strong>
          </div>
          <div className="overall-gauge__yoy-row">
            <span>ปี {currLabel}</span>
            <strong style={{ color }}>{fmtScore(score, max)}</strong>
          </div>
          <div className="overall-gauge__yoy-delta" style={{ color: delta >= 0 ? '#059669' : '#dc2626' }}>
            {delta >= 0 ? '+' : ''}
            {fmtScore(delta, max)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { SWOT_SECTIONS, swotHasContent } from '@/lib/swot/schema';

function groupCommentsByDate(comments: SchoolComment[]) {
  const map = new Map<string, SchoolComment[]>();
  for (const c of comments) {
    const day = c.created_at.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(c);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function swotLongTexts(swot: SchoolSwot) {
  return {
    internalStrengths: swot.internal.strengths.trim(),
    internalWeaknesses: swot.internal.weaknesses.trim(),
    externalStrengths: swot.external.strengths.trim(),
    externalThreats: swot.external.threats.trim(),
  };
}

export type SchoolVisitHistoryItem = {
  id: string;
  date: string;
  activity: string;
  status_th?: string | null;
  notes?: string;
  staff_name?: string | null;
};

export type PillarIndicatorScore = {
  code: string;
  column: string;
  label: string;
  score: number;
};

export function SchoolDetailClient({
  school,
  canEdit,
  canViewComments = false,
  canComment,
  showScores = true,
  guestView = false,
  initialComments,
  initialSwot,
  initialAchievements,
  visitHistory = [],
  pillarIndicators,
}: {
  school: SchoolFull;
  canEdit: boolean;
  canViewComments?: boolean;
  canComment: boolean;
  showScores?: boolean;
  guestView?: boolean;
  initialComments: SchoolComment[];
  initialSwot: SchoolSwot;
  initialAchievements: SchoolAchievements;
  /** Calendar / schedule history for this school (read-only) */
  visitHistory?: SchoolVisitHistoryItem[];
  /** 3-pillar indicators mapped via Label_Lookup + school_pillar_scores */
  pillarIndicators?: Record<
    'qualitySchool' | 'qualityGraduation' | 'disciplineMorality',
    PillarIndicatorScore[]
  >;
}) {
  const [tab, setTab] = useState<TabId>('overview');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [comments] = useState(() => initialComments);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const groups = groupCommentsByDate(initialComments);
    return groups[0] ? new Set([groups[0][0]]) : new Set();
  });

  const activityGroups = useMemo(() => groupCommentsByDate(comments), [comments]);
  const visibleGroups = showAllActivity ? activityGroups : activityGroups.slice(0, 3);
  const swotTexts = useMemo(() => swotLongTexts(initialSwot), [initialSwot]);
  const hasSwot = useMemo(() => swotHasContent(initialSwot), [initialSwot]);

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
  const directorPhoto = directorPictureUrl(school.director);

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
  const three = school.threePillarScores ?? {
    qualitySchool: 0,
    qualityGraduation: 0,
    disciplineMorality: 0,
    overall: 0,
  };
  const currYearLabel = scoreYearToBeLabel(SCORE_YEAR_CURRENT);
  const prevYearLabel = scoreYearToBeLabel(SCORE_YEAR_PREVIOUS);
  const prevScores = (school.School_Score_Previous ?? null) as Record<string, unknown> | null;
  const overallPrev = prevScores
    ? num(prevScores.overall) ||
      (() => {
        const gs = [
          num(prevScores.G01),
          num(prevScores.G02),
          num(prevScores.G03),
          num(prevScores.G04),
          num(prevScores.G05),
        ];
        const pos = gs.filter((n) => n > 0);
        return pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : 0;
      })()
    : null;
  const gScoresPrev = prevScores
    ? [
        num(prevScores.G01),
        num(prevScores.G02),
        num(prevScores.G03),
        num(prevScores.G04),
        num(prevScores.G05),
      ]
    : null;
  const threePrev: ThreePillarScores | null = school.threePillarScoresPrevious ?? null;
  const hasSmsPrev = overallPrev != null && (overallPrev > 0 || (gScoresPrev?.some((n) => n > 0) ?? false));
  const hasThreePrev =
    threePrev != null &&
    (threePrev.overall > 0 ||
      threePrev.qualitySchool > 0 ||
      threePrev.qualityGraduation > 0 ||
      threePrev.disciplineMorality > 0);

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

  const tabs: { id: TabId; label: string; icon: typeof Home }[] = guestView
    ? [
        { id: 'overview', label: 'ภาพรวม', icon: Home },
        { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: Info },
        { id: 'location', label: 'ที่ตั้งและแผนที่', icon: MapIcon },
        { id: 'swot', label: 'SWOT โรงเรียน', icon: ClipboardPen },
      ]
    : [
        { id: 'overview', label: 'ภาพรวม', icon: Home },
        { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: Info },
        { id: 'swot', label: 'SWOT โรงเรียน', icon: ClipboardPen },
        { id: 'visits', label: 'การลงพื้นที่', icon: CalendarDays },
        ...(showScores
          ? [
              { id: 'pillars' as const, label: '3 เสาหลัก', icon: Sparkles },
              { id: 'scores' as const, label: 'ผลการประเมินตามระบบ SMS', icon: Award },
            ]
          : []),
        { id: 'people', label: 'นักเรียน / บุคลากร', icon: Users },
      ];

  const mapsUrl =
    hasCoords
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.school_name_th + ' ' + (school.province || ''))}`;

  const renderActivityFeed = () => (
    <section className="panel-card space-y-3 school-activity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-tm-blue" />
          <h2 className="section-heading text-base m-0">บันทึกกิจกรรม</h2>
        </div>
        {canComment && (
          <Link
            href={`/reports/new?school_id=${encodeURIComponent(String(school.school_id))}`}
            className="ed-btn ed-btn--primary ed-btn--sm"
          >
            <FilePlus2 size={14} /> ส่งรายงาน
          </Link>
        )}
      </div>
      {activityGroups.length === 0 ? (
        <p className="school-empty-note m-0">ยังไม่มีกิจกรรมของโรงเรียนนี้</p>
      ) : (
        <div className="school-activity__list">
          {visibleGroups.map(([day, items]) => {
            const open = expandedDays.has(day);
            return (
              <article key={day} className="school-activity__day">
                <button
                  type="button"
                  className="school-activity__day-head"
                  aria-expanded={open}
                  onClick={() =>
                    setExpandedDays((prev) => {
                      const next = new Set(prev);
                      if (next.has(day)) next.delete(day);
                      else next.add(day);
                      return next;
                    })
                  }
                >
                  <div>
                    <strong>
                      {formatThaiDateWithWeekday(day)}
                    </strong>
                    <div className="school-activity__day-preview">
                      {open ? 'คลิกเพื่อย่อ' : items[0]?.text.slice(0, 72) || '—'}
                      {!open && (items[0]?.text.length ?? 0) > 72 ? '…' : ''}
                    </div>
                  </div>
                  <span className="school-activity__count">{items.length} รายการ</span>
                </button>
                {open && (
                  <ul className="school-activity__items">
                    {items.map((c) => (
                      <li key={c.id}>
                        <div className="school-activity__meta">
                          <strong>{c.staff_name}</strong>
                          <span>{formatThaiTime(c.created_at)}</span>
                        </div>
                        <p>{c.text}</p>
                        {c.image_urls && c.image_urls.length > 0 ? (
                          <ImageThumbGrid urls={c.image_urls} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
          {activityGroups.length > 3 && (
            <button
              type="button"
              className="ed-btn ed-btn--outline ed-btn--sm w-fit"
              onClick={() => setShowAllActivity((v) => !v)}
            >
              {showAllActivity
                ? 'แสดงเฉพาะ 3 วันล่าสุด'
                : `ดูกิจกรรมทั้งหมด (${activityGroups.length} วัน)`}
            </button>
          )}
        </div>
      )}
    </section>
  );

  const renderSwotLongText = () => (
    <div className="swot-long space-y-5">
      {SWOT_SECTIONS.map((section) => (
        <div key={section.group} className="prose-stack">
          <h3 className="prose-stack__group">{section.group}</h3>
          {section.items.map((item) => {
            const text =
              item.key === 'internal.strengths'
                ? swotTexts.internalStrengths
                : item.key === 'internal.weaknesses'
                  ? swotTexts.internalWeaknesses
                  : item.key === 'external.strengths'
                    ? swotTexts.externalStrengths
                    : swotTexts.externalThreats;
            return (
              <div key={item.key} className="prose-stack__item">
                <h4 className="prose-stack__title">
                  {item.code} {item.label}
                </h4>
                <p className="prose-stack__body swot-long__text whitespace-pre-wrap">
                  {text || '— ยังไม่มีข้อมูล —'}
                </p>
              </div>
            );
          })}
        </div>
      ))}
      {!hasSwot && (
        <p className="text-sm text-slate-500 m-0">ยังไม่มีข้อมูล SWOT สำหรับโรงเรียนนี้</p>
      )}
    </div>
  );

  const renderLocationPanel = () => (
    <div className="school-loc-panel panel-card">
      <h2 className="section-heading text-base">ที่ตั้งโรงเรียน</h2>
      <div className="school-loc-panel__grid">
        {hasCoords ? (
          <MiniMap lat={lat} lng={lng} name={school.school_name_th} className="school-mini-map school-mini-map--panel" />
        ) : (
          <div className="school-loc-panel__map-fallback">ไม่มีพิกัดบนแผนที่</div>
        )}
        <div className="school-loc-panel__facts">
          <div><MapPin size={16} /><div><em>ที่อยู่</em><strong>{address || '—'}</strong></div></div>
          <div><Building2 size={16} /><div><em>อำเภอ / จังหวัด</em><strong>{[school.district, school.province].filter(Boolean).join(' · ') || '—'}</strong></div></div>
          <div><Sparkles size={16} /><div><em>สังกัด / เขตพื้นที่</em><strong>{areaName || '—'}</strong></div></div>
          <div><MapIcon size={16} /><div><em>พิกัด</em><strong>{hasCoords ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '—'}</strong></div></div>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="ed-btn ed-btn--primary ed-btn--sm w-fit">
            เปิดใน Google Maps
          </a>
        </div>
      </div>
    </div>
  );

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
        {!guestView && (
          <>
            <span className="text-slate-300">·</span>
            <Link
              href={`/tickets/new?school_id=${school.school_id}&school_name=${encodeURIComponent(school.school_name_th)}`}
              prefetch
              className="text-tm-blue hover:underline inline-flex items-center gap-1"
            >
              <ClipboardPen size={14} />
              ขอแก้ไขข้อมูล (Ticket)
            </Link>
          </>
        )}
      </nav>

      <header className={`school-profile-card ${guestView ? 'school-profile-card--guest' : ''}`}>
        <div
          className="school-profile-card__photo"
          style={{ backgroundImage: `url(${schoolCoverImage(school)})` }}
          role="img"
          aria-label="ภาพโรงเรียน"
        />
        <div className="school-profile-card__body">
          <div className="school-profile-card__identity">
            <div className="school-profile-card__seal" aria-hidden>
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="school-profile-card__name">{school.school_name_th}</h1>
              <p className="school-profile-card__place m-0">
                {[school.district ? `อำเภอ${school.district}` : '', school.province ? `จังหวัด${school.province}` : '']
                  .filter(Boolean)
                  .join(' ') || '—'}
              </p>
              <p className="school-profile-card__id m-0">รหัสสถานศึกษา {school.school_id}</p>
            </div>
          </div>
          <div className="school-profile-card__badges">
            <div className="school-profile-badge">
              <Building2 size={18} />
              <div>
                <em>สังกัด</em>
                <strong>สพฐ. / โครงการกองทุนการศึกษา</strong>
              </div>
            </div>
            <div className="school-profile-badge">
              <MapPin size={18} />
              <div>
                <em>เขตพื้นที่การศึกษา</em>
                <strong>{areaName || '—'}</strong>
              </div>
            </div>
            <div className="school-profile-badge">
              <span className="school-profile-badge__avatar" aria-hidden>
                {directorPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={directorPhoto}
                    alt=""
                    className="school-profile-badge__avatar-img"
                  />
                ) : (
                  <UserRound size={18} className="school-profile-badge__avatar-icon" />
                )}
              </span>
              <div>
                <em>ผู้อำนวยการโรงเรียน</em>
                {school.director_id ? (
                  <strong>
                    <Link
                      href={`/schools/${school.school_id}/director`}
                      className="hover:underline text-inherit"
                    >
                      {directorDisplayLabel(school)}
                    </Link>
                  </strong>
                ) : (
                  <strong>{directorDisplayLabel(school) || DIRECTOR_TBA_LABEL}</strong>
                )}
              </div>
            </div>
            <div className="school-profile-badge">
              <Phone size={18} />
              <div>
                <em>เบอร์ติดต่อ</em>
                <strong>{school.phone || '—'}</strong>
              </div>
            </div>
          </div>
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
              className={`school-tab ${active ? 'school-tab--active' : ''} ${
                t.id === 'pillars' ? 'school-tab--pillars' : ''
              } ${t.id === 'scores' ? 'school-tab--scores' : ''}`}
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
          {guestView ? (
            <>
              <div className="school-guest-overview">
                {renderLocationPanel()}
                <section className="panel-card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="section-heading text-base m-0">SWOT โรงเรียน</h2>
                    <span className="text-xs text-slate-500">ภาพรวมสาธารณะ</span>
                  </div>
                  {renderSwotLongText()}
                </section>
              </div>
              <div className="panel-card">
                <h2 className="section-heading text-base">ระดับชั้นที่เปิดสอน</h2>
                {offeredLevels.length === 0 ? (
                  <p className="text-sm text-slate-500 m-0">ยังไม่มีข้อมูลจำนวนนักเรียนรายระดับ</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {offeredLevels.map((lv) => (
                      <span key={lv} className="school-chip">{lv}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
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
                {showScores && (
                  <>
                    <article className="kpi-card">
                      <div className="kpi-card__icon">
                        <Award size={22} />
                      </div>
                      <div>
                        <div className="kpi-card__label">คะแนนรวมตามระบบ SMS</div>
                        <div className="kpi-card__value" style={{ color: scoreColor(overall) }}>
                          {overall.toFixed(2)}
                        </div>
                        <div className="kpi-card__hint">
                          ปี {currYearLabel}
                          {hasSmsPrev ? ` · ปี ${prevYearLabel} ${(overallPrev as number).toFixed(2)}` : ''}
                          {' · / 5.00'}
                        </div>
                      </div>
                    </article>
                    <article className="kpi-card">
                      <div className="kpi-card__icon kpi-card__icon--seafoam">
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <div className="kpi-card__label">คะแนนรวม 3 เสาหลัก</div>
                        <div className="kpi-card__value" style={{ color: scoreColor(three.overall) }}>
                          {three.overall.toFixed(1)}
                        </div>
                        <div className="kpi-card__hint">
                          ปี {currYearLabel}
                          {hasThreePrev ? ` · ปี ${prevYearLabel} ${threePrev!.overall.toFixed(1)}` : ''}
                          {' · / 100'}
                        </div>
                      </div>
                    </article>
                  </>
                )}
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
                      <span key={lv} className="school-chip">{lv}</span>
                    ))}
                  </div>
                )}
              </div>

              {showScores && (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
                >
                  <div className="panel-card space-y-3">
                    <h2 className="section-heading text-base m-0">ผลการประเมินตามระบบ SMS</h2>
                    <OverallGauge
                      score={overall}
                      prevScore={hasSmsPrev ? overallPrev : null}
                      currLabel={currYearLabel}
                      prevLabel={prevYearLabel}
                    />
                    <div className="space-y-2 pt-2">
                      {gScores.map((g) => (
                        <div key={g.code} className="flex justify-between text-sm gap-2">
                          <span className="text-slate-600">{g.label}</span>
                          <strong className="text-tm-blue">{g.value.toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel-card space-y-3">
                    <h2 className="section-heading text-base m-0">3 เสาหลัก</h2>
                    <OverallGauge
                      score={three.overall}
                      max={100}
                      prevScore={hasThreePrev ? threePrev!.overall : null}
                      currLabel={currYearLabel}
                      prevLabel={prevYearLabel}
                    />
                    <div className="space-y-2 pt-2">
                      {(
                        [
                          [THREE_PILLAR_LABELS.qualitySchool, three.qualitySchool],
                          [THREE_PILLAR_LABELS.qualityGraduation, three.qualityGraduation],
                          [THREE_PILLAR_LABELS.disciplineMorality, three.disciplineMorality],
                        ] as const
                      ).map(([label, score]) => (
                        <div key={label} className="flex justify-between text-sm gap-2">
                          <span className="text-slate-600">{label}</span>
                          <strong className="text-tm-blue">{score.toFixed(1)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mapBlock}
              {canViewComments && renderActivityFeed()}
            </>
          )}
        </div>
      )}

      {tab === 'location' && <div className="space-y-4">{renderLocationPanel()}</div>}

      {tab === 'swot' && (
        <section className="panel-card space-y-4">
          <h2 className="section-heading text-base m-0">การวิเคราะห์สภาพแวดล้อม — SWOT</h2>
          {renderSwotLongText()}
        </section>
      )}

      {tab === 'visits' && (
        <div className="space-y-4">
          <section className="panel-card space-y-3">
            <h2 className="section-heading text-base m-0">ประวัติปฏิทิน / นัดหมายลงพื้นที่</h2>
            <p className="text-xs text-slate-500 m-0">
              อ้างอิงจากปฏิทินนัดหมายเท่านั้น — ไม่สามารถแก้ไขจากหน้านี้
            </p>
            {visitHistory.length === 0 ? (
              <p className="text-sm text-slate-500 m-0">ยังไม่มีนัดหมายลงพื้นที่สำหรับโรงเรียนนี้</p>
            ) : (
              <ul className="m-0 p-0 list-none space-y-2">
                {visitHistory.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-xl border border-slate-100 px-3 py-2.5 text-sm flex flex-wrap justify-between gap-2"
                  >
                    <div>
                      <strong className="text-tm-blue">
                        {formatThaiDate(v.date)}
                      </strong>
                      <div className="text-slate-600">{v.activity}</div>
                      {v.notes ? <div className="text-xs text-slate-500 mt-0.5">{v.notes}</div> : null}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{v.status_th || 'นัดหมายแล้ว'}</div>
                      {v.staff_name ? <div>{v.staff_name}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {renderActivityFeed()}
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
        <div className="space-y-4 school-scores-panel">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            <div className="panel-card school-scores-panel__card">
              <h2 className="section-heading text-base m-0 mb-3">คะแนนรวมตามระบบ SMS</h2>
              <OverallGauge
                score={overall}
                prevScore={hasSmsPrev ? overallPrev : null}
                currLabel={currYearLabel}
                prevLabel={prevYearLabel}
              />
            </div>
            <div className="panel-card school-scores-panel__card">
              <h2 className="section-heading text-base">เปรียบเทียบคะแนน</h2>
              <DualRadarChart
                labels={gScores.map((g) => g.label.replace(/^ด้าน/, ''))}
                schoolScores={gScores.map((g) => g.value)}
                schoolLabel={`ปี ${currYearLabel}`}
                nationalScores={hasSmsPrev && gScoresPrev ? gScoresPrev : undefined}
                nationalLabel={`ปี ${prevYearLabel}`}
                showNational={hasSmsPrev}
                maxScale={5}
              />
            </div>
          </div>

          <div className="panel-card school-scores-panel__card space-y-3">
            <h2 className="section-heading text-base m-0">กลุ่มผลการประเมินตามระบบ SMS</h2>
            <div className="score-grid-2">
              {gScores.map((g) => (
                <ScoreBar key={g.code} label={g.label} score={g.value} showCode={false} />
              ))}
            </div>
          </div>

          {indicatorGroups.map((grp) => (
            <section key={grp.prefix} className="panel-card school-scores-panel__card space-y-3">
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

      {tab === 'pillars' && (
        <div className="space-y-4 school-pillars-panel">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            <div className="panel-card school-pillars-panel__card">
              <h2 className="section-heading text-base m-0 mb-3">คะแนนรวม 3 เสาหลัก</h2>
              <OverallGauge
                score={three.overall}
                max={100}
                prevScore={hasThreePrev ? threePrev!.overall : null}
                currLabel={currYearLabel}
                prevLabel={prevYearLabel}
              />
            </div>
            <div className="panel-card school-pillars-panel__card">
              <h2 className="section-heading text-base">ภาพรวม 3 เสาหลัก</h2>
              <DualRadarChart
                labels={[
                  THREE_PILLAR_LABELS.qualitySchool,
                  THREE_PILLAR_LABELS.qualityGraduation,
                  THREE_PILLAR_LABELS.disciplineMorality,
                ]}
                schoolScores={[
                  three.qualitySchool,
                  three.qualityGraduation,
                  three.disciplineMorality,
                ]}
                schoolLabel={`ปี ${currYearLabel}`}
                nationalScores={
                  hasThreePrev
                    ? [
                        threePrev!.qualitySchool,
                        threePrev!.qualityGraduation,
                        threePrev!.disciplineMorality,
                      ]
                    : undefined
                }
                nationalLabel={`ปี ${prevYearLabel}`}
                showNational={hasThreePrev}
                maxScale={100}
                tickValues={[0, 50, 100]}
              />
            </div>
          </div>

          {(
            [
              ['qualitySchool', THREE_PILLAR_LABELS.qualitySchool, three.qualitySchool],
              ['qualityGraduation', THREE_PILLAR_LABELS.qualityGraduation, three.qualityGraduation],
              ['disciplineMorality', THREE_PILLAR_LABELS.disciplineMorality, three.disciplineMorality],
            ] as const
          ).map(([key, title, score]) => {
            const inds =
              pillarIndicators?.[key] ??
              THREE_PILLAR_INDICATOR_DEFS[key].map((d) => ({
                code: d.code,
                column: '',
                label: d.label,
                score: 0,
              }));
            return (
              <section key={key} className="panel-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="section-heading text-base m-0">{title}</h2>
                  <strong className="text-tm-blue text-lg">{score.toFixed(1)} / 100</strong>
                </div>
                <ul className="m-0 p-0 list-none grid gap-2">
                  {inds.map((ind) => (
                    <li
                      key={ind.code}
                      className="flex justify-between gap-3 text-sm rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <span>
                        <strong className="text-slate-800 mr-1">{ind.code}</strong>
                        {ind.label}
                        {ind.column ? (
                          <span className="text-[10px] text-slate-400 ml-1">({ind.column})</span>
                        ) : null}
                      </span>
                      <strong className="text-tm-blue shrink-0">{ind.score.toFixed(1)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
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
