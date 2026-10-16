'use client';

import { useMemo } from 'react';
import Link from 'next/link';
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
  AlertTriangle,
  Award,
  Building2,
  Clock3,
  MessageSquarePlus,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { SchoolFull, UserRole } from '@/lib/types';
import type { StaffCalendarEvent } from '@/lib/auth/mock-users';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';
import { DashboardWelcome } from '@/components/dashboard/DashboardWelcome';
import { formatThaiDate } from '@/lib/format/date';

export type PendingReportVisit = {
  id: string;
  school_id: string | null;
  school_name: string;
  date: string;
};
import {
  SuperOverseerActivityPanel,
  type ActivityPerson,
  type ActivitySchool,
} from '@/components/dashboard/SuperOverseerActivityPanel';
import { SuperOverseerComparePanel } from '@/components/dashboard/SuperOverseerComparePanel';
import type { CompareScoresByYear } from '@/lib/supabase/schools';
import type { ReportActivityLink } from '@/lib/activity/complete';
import {
  DEV_STATUS,
  DEV_STATUS_ORDER,
  STRATEGY_LABELS,
  statusFromScore,
  type DevStatusKey,
} from '@/lib/theme/status';
import { THREE_PILLAR_LABELS } from '@/lib/mock/pillars';
import {
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
  scoreYearToBeLabel,
} from '@/lib/scores/years';

function statusIcon(key: DevStatusKey) {
  if (key === 'develop') return AlertTriangle;
  if (key === 'fair') return TrendingUp;
  if (key === 'good') return Clock3;
  if (key === 'veryGood') return Star;
  return Award;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export function StaffDashboardClient({
  schools,
  nationalSchools,
  roleLabel,
  role,
  staffName,
  birthday,
  namePrefix,
  calendarEvents = [],
  activityPeople = [],
  activitySchools = [],
  activityReports = [],
  compareScoresByYear,
  pendingReportVisits = [],
}: {
  schools: SchoolFull[];
  /** All-project schools for national average shadow on charts */
  nationalSchools?: SchoolFull[];
  roleLabel: string;
  role?: UserRole;
  staffName?: string;
  birthday?: string | null;
  namePrefix?: string | null;
  calendarEvents?: StaffCalendarEvent[];
  activityPeople?: ActivityPerson[];
  activitySchools?: ActivitySchool[];
  activityReports?: ReportActivityLink[];
  /** Exact-year SMS + 3-pillar maps for SO comparison charts */
  compareScoresByYear?: CompareScoresByYear;
  /** Staff-only: past visits still missing a report */
  pendingReportVisits?: PendingReportVisit[];
}) {
  const isSuperOverseer = role === 'super_overseer';
  const isStaff = role === 'staff';
  const showReportReminder = isStaff && pendingReportVisits.length > 0;
  const firstPending = pendingReportVisits[0];
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

  const fiveAvg = useMemo(() => {
    if (!schools.length) return STRATEGY_LABELS.map(() => 0);
    return STRATEGY_LABELS.map((p) => {
      const sum = schools.reduce((acc, s) => acc + (s.pillarScores?.[p.key] ?? 0), 0);
      return sum / schools.length;
    });
  }, [schools]);

  const threeAvg = useMemo(() => {
    if (!schools.length) {
      return { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0, overall: 0 };
    }
    const qualitySchool =
      schools.reduce((a, s) => a + (s.threePillarScores?.qualitySchool ?? 0), 0) / schools.length;
    const qualityGraduation =
      schools.reduce((a, s) => a + (s.threePillarScores?.qualityGraduation ?? 0), 0) / schools.length;
    const disciplineMorality =
      schools.reduce((a, s) => a + (s.threePillarScores?.disciplineMorality ?? 0), 0) / schools.length;
    const overall = (qualitySchool + qualityGraduation + disciplineMorality) / 3;
    return { qualitySchool, qualityGraduation, disciplineMorality, overall };
  }, [schools]);

  const fiveOverall =
    schools.length === 0
      ? 0
      : schools.reduce((a, s) => a + (s.overallScore ?? 0), 0) / schools.length;

  const nationPool = nationalSchools?.length ? nationalSchools : schools;

  const nationalFiveAvg = useMemo(() => {
    if (!nationPool.length) return STRATEGY_LABELS.map(() => 0);
    return STRATEGY_LABELS.map((p) => {
      const vals = nationPool
        .map((s) => s.pillarScores?.[p.key] ?? 0)
        .filter((v) => v > 0);
      if (!vals.length) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
  }, [nationPool]);

  const nationalThreeAvg = useMemo(() => {
    if (!nationPool.length) {
      return { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0 };
    }
    const avgKey = (key: 'qualitySchool' | 'qualityGraduation' | 'disciplineMorality') => {
      const vals = nationPool
        .map((s) => s.threePillarScores?.[key] ?? 0)
        .filter((v) => v > 0);
      if (!vals.length) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      qualitySchool: avgKey('qualitySchool'),
      qualityGraduation: avgKey('qualityGraduation'),
      disciplineMorality: avgKey('disciplineMorality'),
    };
  }, [nationPool]);

  /** SO radar: previous-year averages from exact school_year maps (YoY, not vs national). */
  const prevYearThreeAvg = useMemo(() => {
    const empty = { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0, overall: 0 };
    const yearMap = compareScoresByYear?.[SCORE_YEAR_PREVIOUS];
    if (!yearMap || !schools.length) return empty;
    const rows = schools
      .map((s) => yearMap[String(s.school_id)]?.three)
      .filter(Boolean) as { qualitySchool: number; qualityGraduation: number; disciplineMorality: number; overall: number }[];
    if (!rows.length) return empty;
    const avg = (pick: (r: (typeof rows)[0]) => number) =>
      rows.reduce((a, r) => a + pick(r), 0) / rows.length;
    return {
      qualitySchool: avg((r) => r.qualitySchool),
      qualityGraduation: avg((r) => r.qualityGraduation),
      disciplineMorality: avg((r) => r.disciplineMorality),
      overall: avg((r) => r.overall),
    };
  }, [compareScoresByYear, schools]);

  const prevYearFiveAvg = useMemo(() => {
    const yearMap = compareScoresByYear?.[SCORE_YEAR_PREVIOUS];
    if (!yearMap || !schools.length) return STRATEGY_LABELS.map(() => 0);
    const rows = schools
      .map((s) => yearMap[String(s.school_id)]?.sms)
      .filter(Boolean) as NonNullable<(typeof yearMap)[string]>['sms'][];
    if (!rows.length) return STRATEGY_LABELS.map(() => 0);
    return STRATEGY_LABELS.map((p) => rows.reduce((a, r) => a + (r[p.key] ?? 0), 0) / rows.length);
  }, [compareScoresByYear, schools]);

  const currYearLabel = scoreYearToBeLabel(SCORE_YEAR_CURRENT);
  const prevYearLabel = scoreYearToBeLabel(SCORE_YEAR_PREVIOUS);

  const statusColors = DEV_STATUS_ORDER.map((k) => DEV_STATUS[k].color);

  const statusBar = {
    labels: DEV_STATUS_ORDER.map((k) => DEV_STATUS[k].label),
    datasets: [
      {
        label: 'จำนวนโรงเรียน',
        data: DEV_STATUS_ORDER.map((k) => counts[k]),
        backgroundColor: statusColors,
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const statusDonut = {
    labels: DEV_STATUS_ORDER.map((k) => DEV_STATUS[k].label),
    datasets: [
      {
        data: DEV_STATUS_ORDER.map((k) => counts[k]),
        backgroundColor: statusColors,
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const topFive = useMemo(
    () =>
      [...schools]
        .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
        .slice(0, 10),
    [schools]
  );

  const topThree = useMemo(
    () =>
      [...schools]
        .sort(
          (a, b) =>
            (b.threePillarScores?.overall ?? 0) - (a.threePillarScores?.overall ?? 0)
        )
        .slice(0, 10),
    [schools]
  );

  const lowFive = useMemo(
    () =>
      [...schools]
        .sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0))
        .slice(0, 10),
    [schools]
  );

  const lowThree = useMemo(
    () =>
      [...schools]
        .sort(
          (a, b) =>
            (a.threePillarScores?.overall ?? 0) - (b.threePillarScores?.overall ?? 0)
        )
        .slice(0, 10),
    [schools]
  );

  return (
    <div className="page-shell py-5 space-y-5">
      <DashboardWelcome
        fullName={staffName || 'อาสาสมัคร'}
        birthday={birthday}
        namePrefix={namePrefix}
      />

      {showReportReminder ? (
        <section
          className="ed-card p-4 flex flex-wrap items-start justify-between gap-3"
          style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}
          role="status"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle size={18} aria-hidden />
              แจ้งเตือน · ยังไม่ได้สรุปรายงานหลังลงพื้นที่
            </div>
            <p className="text-sm text-amber-900/90 m-0 mt-1">
              มี {pendingReportVisits.length} นัดที่วันลงพื้นที่ผ่านไปแล้ว
              แต่ยังไม่มีรายงานสรุป — กรุณาเขียนสรุปรายงานให้ครบ
            </p>
            <ul className="m-0 mt-2 p-0 list-none text-sm text-amber-950 space-y-0.5">
              {pendingReportVisits.slice(0, 3).map((v) => (
                <li key={v.id}>
                  {formatThaiDate(v.date)} · {v.school_name}
                </li>
              ))}
              {pendingReportVisits.length > 3 ? (
                <li className="text-amber-800/80">
                  และอีก {pendingReportVisits.length - 3} นัด…
                </li>
              ) : null}
            </ul>
          </div>
          <Link
            href={
              firstPending
                ? `/reports/new?event_id=${encodeURIComponent(firstPending.id)}${
                    firstPending.school_id
                      ? `&school_id=${encodeURIComponent(firstPending.school_id)}`
                      : ''
                  }&date=${encodeURIComponent(firstPending.date)}`
                : '/reports/new'
            }
            className="ed-btn ed-btn--primary ed-btn--sm shrink-0"
          >
            <MessageSquarePlus size={14} /> เขียนสรุปรายงาน
          </Link>
        </section>
      ) : null}

      <div>
        <h2 className="ed-section-title m-0 text-base">แดชบอร์ด · {roleLabel}</h2>
        <p className="text-sm text-slate-600 m-0 mt-1">
          สรุปคะแนนตามระบบ SMS และ 3 เสาหลัก · โรงเรียนของฉัน {schools.length} แห่ง
        </p>
      </div>

      {isSuperOverseer ? (
        <SuperOverseerActivityPanel
          events={calendarEvents}
          people={activityPeople}
          schools={activitySchools}
          reports={activityReports}
        />
      ) : null}

      <div className="managed-status-row">
        <Link
          href="/schools?status=all"
          className="status-card status-card--link"
          style={{ borderColor: 'var(--tm-gold)' }}
        >
          <div
            className="status-card__icon"
            style={{ background: 'var(--tm-gold-50)', color: 'var(--tm-blue)' }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <div className="status-card__value text-tm-blue">{counts.all}</div>
            <div className="status-card__label">โรงเรียนของฉัน</div>
          </div>
        </Link>
        {DEV_STATUS_ORDER.map((k) => {
          const meta = DEV_STATUS[k];
          const Icon = statusIcon(k);
          return (
            <Link
              key={k}
              href={`/schools?status=${encodeURIComponent(k)}`}
              className="status-card status-card--link"
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
            </Link>
          );
        })}
      </div>

      {schools.length === 0 ? (
        <div className="ed-card p-6 text-center text-slate-500">
          ยังไม่มีโรงเรียนในขอบเขตของคุณ — ติดต่อผู้ดูแลระบบเพื่อมอบหมายพื้นที่
        </div>
      ) : (
        <>
          {isSuperOverseer ? (
            <SuperOverseerComparePanel
              schools={schools}
              scoresByYear={compareScoresByYear}
            />
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <section className="ed-card p-4">
                <h2 className="ed-section-title text-base m-0 mb-3">สัดส่วนสถานะการพัฒนา</h2>
                <div style={{ height: 240 }}>
                  <Doughnut
                    data={statusDonut}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
                </div>
              </section>
              <section className="ed-card p-4">
                <h2 className="ed-section-title text-base m-0 mb-3">จำนวนตามสถานะ</h2>
                <div style={{ height: 240 }}>
                  <Bar
                    data={statusBar}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    }}
                  />
                </div>
              </section>
            </div>
          )}

          <section className="ed-card p-4 space-y-4 schools-list-panel schools-list-panel--three">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="ed-section-title text-base m-0">3 เสาหลัก</h2>
                <p className="text-sm text-slate-500 m-0 mt-1">
                  {isSuperOverseer
                    ? `เปรียบเทียบปี ${prevYearLabel} กับปี ${currYearLabel}`
                    : 'เปรียบเทียบกับค่าเฉลี่ยทั้งประเทศ'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-tm-blue">{threeAvg.overall.toFixed(1)}</div>
                <div className="text-xs text-slate-500">
                  {isSuperOverseer ? `ปี ${currYearLabel} · / 100` : 'เฉลี่ยในความดูแล / 100'}
                </div>
              </div>
            </div>
            <DualRadarChart
              labels={
                isSuperOverseer
                  ? ['เสาหลัก 1', 'เสาหลัก 2', 'เสาหลัก 3']
                  : [
                      THREE_PILLAR_LABELS.qualitySchool,
                      THREE_PILLAR_LABELS.qualityGraduation,
                      THREE_PILLAR_LABELS.disciplineMorality,
                    ]
              }
              schoolScores={[
                threeAvg.qualitySchool,
                threeAvg.qualityGraduation,
                threeAvg.disciplineMorality,
              ]}
              nationalScores={
                isSuperOverseer
                  ? [
                      prevYearThreeAvg.qualitySchool,
                      prevYearThreeAvg.qualityGraduation,
                      prevYearThreeAvg.disciplineMorality,
                    ]
                  : [
                      nationalThreeAvg.qualitySchool,
                      nationalThreeAvg.qualityGraduation,
                      nationalThreeAvg.disciplineMorality,
                    ]
              }
              schoolLabel={isSuperOverseer ? `ปี ${currYearLabel}` : 'เฉลี่ยในความดูแล'}
              nationalLabel={isSuperOverseer ? `ปี ${prevYearLabel}` : 'เฉลี่ยทั้งประเทศ'}
              maxScale={100}
              tickValues={[0, 50, 100]}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['qualitySchool', THREE_PILLAR_LABELS.qualitySchool, '#0b4da2'],
                  ['qualityGraduation', THREE_PILLAR_LABELS.qualityGraduation, '#059669'],
                  ['disciplineMorality', THREE_PILLAR_LABELS.disciplineMorality, '#ea580c'],
                ] as const
              ).map(([key, label, color]) => (
                <div key={key} className="rounded-xl border border-slate-100 bg-white/80 p-3 text-center">
                  <div className="text-xs font-semibold text-slate-600 mb-1 leading-snug">{label}</div>
                  <div className="text-xl font-extrabold" style={{ color }}>
                    {threeAvg[key].toFixed(1)}
                    {isSuperOverseer ? (
                      <span className="text-xs font-semibold text-slate-400 ml-1">
                        ปี {currYearLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isSuperOverseer
                      ? `ปี ${prevYearLabel}: ${prevYearThreeAvg[key].toFixed(1)} · Δ ${(
                          threeAvg[key] - prevYearThreeAvg[key]
                        ).toFixed(1)}`
                      : `ประเทศ ${nationalThreeAvg[key].toFixed(1)}`}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ed-card p-4 space-y-4 schools-list-panel schools-list-panel--five">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="ed-section-title text-base m-0">ผลการประเมินตามระบบ SMS</h2>
                <p className="text-sm text-slate-500 m-0 mt-1">
                  {isSuperOverseer
                    ? `เปรียบเทียบปี ${prevYearLabel} กับปี ${currYearLabel}`
                    : 'เปรียบเทียบกับค่าเฉลี่ยทั้งประเทศ'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-tm-blue">{fiveOverall.toFixed(2)}</div>
                <div className="text-xs text-slate-500">
                  {isSuperOverseer ? `ปี ${currYearLabel} · / 5.00` : 'เฉลี่ยในความดูแล / 5.00'}
                </div>
              </div>
            </div>
            <DualRadarChart
              labels={STRATEGY_LABELS.map((p) => p.label.replace(/^ด้าน/, ''))}
              schoolScores={fiveAvg}
              nationalScores={isSuperOverseer ? prevYearFiveAvg : nationalFiveAvg}
              schoolLabel={isSuperOverseer ? `ปี ${currYearLabel}` : 'เฉลี่ยในความดูแล'}
              nationalLabel={isSuperOverseer ? `ปี ${prevYearLabel}` : 'เฉลี่ยทั้งประเทศ'}
              maxScale={5}
            />
            <div className="grid gap-3 sm:grid-cols-5">
              {STRATEGY_LABELS.map((p, i) => (
                <div key={p.key} className="rounded-xl border border-slate-100 bg-white/80 p-3 text-center">
                  <div className="text-xs font-semibold text-slate-500 mb-1">{p.label}</div>
                  <div className="text-xl font-extrabold" style={{ color: p.color }}>
                    {(fiveAvg[i] ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isSuperOverseer
                      ? `ปี ${prevYearLabel} ${(prevYearFiveAvg[i] ?? 0).toFixed(2)}`
                      : `ประเทศ ${(nationalFiveAvg[i] ?? 0).toFixed(2)}`}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <RankSchoolList
              panelClass="schools-list-panel--three"
              title="10 โรงเรียนที่มีผลประเมินดีที่สุด"
              subtitle="คะแนน 3 เสาหลัก"
              rows={topThree}
              scoreOf={(s) => s.threePillarScores?.overall ?? 0}
              scoreDigits={1}
              keyPrefix="top-p3"
            />
            <RankSchoolList
              panelClass="schools-list-panel--five"
              title="10 โรงเรียนที่มีผลประเมินดีที่สุด"
              subtitle="ผลการประเมินตามระบบ SMS"
              rows={topFive}
              scoreOf={(s) => s.overallScore ?? 0}
              scoreDigits={2}
              keyPrefix="top-sms"
            />
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <RankSchoolList
              panelClass="schools-list-panel--three"
              title="10 โรงเรียนที่ต้องใส่ใจเร่งด่วน"
              subtitle="คะแนน 3 เสาหลัก"
              rows={lowThree}
              scoreOf={(s) => s.threePillarScores?.overall ?? 0}
              scoreDigits={1}
              keyPrefix="low-p3"
            />
            <RankSchoolList
              panelClass="schools-list-panel--five"
              title="10 โรงเรียนที่ต้องใส่ใจเร่งด่วน"
              subtitle="ผลการประเมินตามระบบ SMS"
              rows={lowFive}
              scoreOf={(s) => s.overallScore ?? 0}
              scoreDigits={2}
              keyPrefix="low-sms"
            />
          </div>
        </>
      )}
    </div>
  );
}

function RankSchoolList({
  panelClass,
  title,
  subtitle,
  rows,
  scoreOf,
  scoreDigits,
  keyPrefix,
}: {
  panelClass: string;
  title: string;
  subtitle: string;
  rows: SchoolFull[];
  scoreOf: (s: SchoolFull) => number;
  scoreDigits: number;
  keyPrefix: string;
}) {
  return (
    <section className={`ed-card p-4 space-y-3 schools-list-panel ${panelClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="ed-section-title text-base m-0">{title}</h2>
          <p className="text-sm text-slate-600 m-0 mt-0.5">{subtitle}</p>
        </div>
        <Link href="/schools" className="ed-btn ed-btn--outline ed-btn--sm">
          ดูรายชื่อโรงเรียน
        </Link>
      </div>
      <div className="grid gap-2">
        {rows.map((s, i) => {
          const score = scoreOf(s);
          const st = statusFromScore(score);
          return (
            <Link
              key={`${keyPrefix}-${s.school_id}`}
              href={`/schools/${s.school_id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
              style={{
                background: st.bg,
                borderColor: st.border,
              }}
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-xs font-bold w-5 shrink-0" style={{ color: st.color }}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <strong className="text-tm-blue">{s.school_name_th}</strong>
                  <div className="text-xs text-slate-500">
                    {[s.district, s.province].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="ed-badge" style={{ background: '#fff', color: st.color }}>
                  {st.label}
                </span>
                <strong style={{ color: st.color }}>{score.toFixed(scoreDigits)}</strong>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
