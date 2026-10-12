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
import { AlertTriangle, Building2, Clock3, Star, TrendingUp } from 'lucide-react';
import type { SchoolFull } from '@/lib/types';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';
import { DashboardWelcome } from '@/components/dashboard/DashboardWelcome';
import { DEV_STATUS, STRATEGY_LABELS, statusFromScore, type DevStatusKey } from '@/lib/theme/status';
import { THREE_PILLAR_LABELS } from '@/lib/mock/pillars';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export function StaffDashboardClient({
  schools,
  nationalSchools,
  roleLabel,
  staffName,
  birthday,
  namePrefix,
}: {
  schools: SchoolFull[];
  /** All-project schools for national average shadow on charts */
  nationalSchools?: SchoolFull[];
  roleLabel: string;
  staffName?: string;
  birthday?: string | null;
  namePrefix?: string | null;
}) {
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

  const statusBar = {
    labels: (Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => DEV_STATUS[k].label),
    datasets: [
      {
        label: 'จำนวนโรงเรียน',
        data: (Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => counts[k]),
        backgroundColor: (Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => DEV_STATUS[k].color),
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const statusDonut = {
    labels: (Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => DEV_STATUS[k].label),
    datasets: [
      {
        data: (Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => counts[k]),
        backgroundColor: (Object.keys(DEV_STATUS) as DevStatusKey[]).map((k) => DEV_STATUS[k].color),
        borderWidth: 0,
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

  return (
    <div className="page-shell py-5 space-y-5">
      <DashboardWelcome
        fullName={staffName || 'อาสาสมัคร'}
        birthday={birthday}
        namePrefix={namePrefix}
      />
      <div>
        <h2 className="ed-section-title m-0 text-base">แดชบอร์ด · {roleLabel}</h2>
        <p className="text-sm text-slate-600 m-0 mt-1">
          สรุปคะแนน 5 กลยุทธ์และ 3 เสาหลัก · โรงเรียนภายใต้ขอบเขต {schools.length} แห่ง
        </p>
      </div>

      <div className="managed-status-row">
        <div className="status-card" style={{ borderColor: '#BFDBFE' }}>
          <div className="status-card__icon" style={{ background: '#DBEAFE', color: '#0B4DA2' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div className="status-card__value text-tm-blue">{counts.all}</div>
            <div className="status-card__label">โรงเรียนภายใต้ขอบเขต</div>
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
      </div>

      {schools.length === 0 ? (
        <div className="ed-card p-6 text-center text-slate-500">
          ยังไม่มีโรงเรียนในขอบเขตของคุณ — ติดต่อผู้ดูแลระบบเพื่อมอบหมายพื้นที่
        </div>
      ) : (
        <>
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

          <section className="ed-card p-4 space-y-4 schools-list-panel schools-list-panel--three">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="ed-section-title text-base m-0">3 เสาหลัก</h2>
                <p className="text-sm text-slate-500 m-0 mt-1">เปรียบเทียบกับค่าเฉลี่ยทั้งประเทศ</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-tm-blue">{threeAvg.overall.toFixed(1)}</div>
                <div className="text-xs text-slate-500">เฉลี่ยในความดูแล / 100</div>
              </div>
            </div>
            <DualRadarChart
              labels={[
                THREE_PILLAR_LABELS.qualitySchool,
                THREE_PILLAR_LABELS.qualityGraduation,
                THREE_PILLAR_LABELS.disciplineMorality,
              ]}
              schoolScores={[
                threeAvg.qualitySchool,
                threeAvg.qualityGraduation,
                threeAvg.disciplineMorality,
              ]}
              nationalScores={[
                nationalThreeAvg.qualitySchool,
                nationalThreeAvg.qualityGraduation,
                nationalThreeAvg.disciplineMorality,
              ]}
              schoolLabel="เฉลี่ยในความดูแล"
              nationalLabel="เฉลี่ยทั้งประเทศ"
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
                  <div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>
                  <div className="text-xl font-extrabold" style={{ color }}>
                    {threeAvg[key].toFixed(1)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    ประเทศ {nationalThreeAvg[key].toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ed-card p-4 space-y-4 schools-list-panel schools-list-panel--five">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="ed-section-title text-base m-0">5 กลยุทธ์</h2>
                <p className="text-sm text-slate-500 m-0 mt-1">เปรียบเทียบกับค่าเฉลี่ยทั้งประเทศ</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-tm-blue">{fiveOverall.toFixed(2)}</div>
                <div className="text-xs text-slate-500">เฉลี่ยในความดูแล / 5.00</div>
              </div>
            </div>
            <DualRadarChart
              labels={STRATEGY_LABELS.map((p) => p.label.replace(/^ด้าน/, ''))}
              schoolScores={fiveAvg}
              nationalScores={nationalFiveAvg}
              schoolLabel="เฉลี่ยในความดูแล"
              nationalLabel="เฉลี่ยทั้งประเทศ"
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
                    ประเทศ {(nationalFiveAvg[i] ?? 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <section className="ed-card p-4 space-y-3 schools-list-panel schools-list-panel--three">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="ed-section-title text-base m-0">Top 10 · 3 เสาหลัก</h2>
                <Link href="/schools" className="ed-btn ed-btn--outline ed-btn--sm">
                  ดูรายชื่อโรงเรียน
                </Link>
              </div>
              <div className="grid gap-2">
                {topThree.map((s, i) => {
                  const score = s.threePillarScores?.overall ?? 0;
                  const st = statusFromScore(score);
                  return (
                    <Link
                      key={`p3-${s.school_id}`}
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
                        <strong style={{ color: st.color }}>{score.toFixed(1)}</strong>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
            <section className="ed-card p-4 space-y-3 schools-list-panel schools-list-panel--five">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="ed-section-title text-base m-0">Top 10 · 5 กลยุทธ์</h2>
                <Link href="/schools" className="ed-btn ed-btn--outline ed-btn--sm">
                  ดูรายชื่อโรงเรียน
                </Link>
              </div>
              <div className="grid gap-2">
                {topFive.map((s, i) => {
                  const score = s.overallScore ?? 0;
                  const st = statusFromScore(score);
                  return (
                    <Link
                      key={`hi-${s.school_id}`}
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
                        <strong style={{ color: st.color }}>{score.toFixed(2)}</strong>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
