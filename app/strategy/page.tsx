import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Download, FileText, Map as MapIcon } from 'lucide-react';
import { fetchSchools } from '@/lib/supabase/schools';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';
import { PageBanner } from '@/components/layout/PageBanner';
import { StrategySkeleton } from '@/components/ui/PageSkeleton';
import { PAGE_BANNERS, type SchoolFull } from '@/lib/types';
import {
  DEV_STATUS,
  DEV_STATUS_ORDER,
  STRATEGY_LABELS,
  statusFromScore,
  type DevStatusKey,
} from '@/lib/theme/status';
import { formatThaiDate } from '@/lib/format/date';

export const revalidate = 120;

function meanPillars(list: SchoolFull[]): number[] {
  if (!list.length) return [0, 0, 0, 0, 0];
  const keys = ['learner', 'participation', 'teacherAdmin', 'curriculum', 'infrastructure'] as const;
  return keys.map((k) => {
    const vals = list.map((x) => x.pillarScores?.[k] ?? 0).filter((v) => v > 0);
    if (!vals.length) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  });
}

function tierCounts(list: SchoolFull[], key: keyof NonNullable<SchoolFull['pillarScores']>) {
  const buckets = Object.fromEntries(DEV_STATUS_ORDER.map((k) => [k, 0])) as Record<
    DevStatusKey,
    number
  >;
  list.forEach((s) => {
    const st = statusFromScore(s.pillarScores?.[key]);
    buckets[st.key] += 1;
  });
  return buckets;
}

/** Top issues = strategies with the most schools in ควรพัฒนา / พอใช้ */
function topIssuesFromData(list: SchoolFull[]) {
  return STRATEGY_LABELS.map((s) => {
    const weak = list.filter((school) => {
      const st = statusFromScore(school.pillarScores?.[s.key]);
      return st.key === 'develop' || st.key === 'fair';
    }).length;
    return { label: s.label, count: weak, color: s.color };
  })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

async function StrategyBody() {
  const schools = await fetchSchools().catch(() => [] as SchoolFull[]);
  const n = Math.max(1, schools.length);
  const avgs = meanPillars(schools);
  const labels = STRATEGY_LABELS.map((s) => s.label.replace('ด้าน', ''));

  const provinceScores = new Map<string, { sum: number; count: number }>();
  schools.forEach((s) => {
    const p = s.province?.trim() || 'ไม่ระบุ';
    const row = provinceScores.get(p) ?? { sum: 0, count: 0 };
    row.sum += s.overallScore ?? 0;
    row.count += 1;
    provinceScores.set(p, row);
  });
  const topProvinces = [...provinceScores.entries()]
    .map(([name, v]) => ({ name, avg: v.count ? v.sum / v.count : 0 }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const overallAvg = avgs.reduce((a, b) => a + b, 0) / 5;
  const excellentShare =
    (schools.filter((s) => statusFromScore(s.overallScore).key === 'excellent').length / n) * 100;

  const ranked = STRATEGY_LABELS.map((s, i) => ({ ...s, score: avgs[i] ?? 0 })).sort(
    (a, b) => b.score - a.score
  );
  const strengths = ranked.filter((s) => s.score > 0).slice(0, 2);
  const priorities = [...ranked].filter((s) => s.score > 0).sort((a, b) => a.score - b.score).slice(0, 2);
  const issues = topIssuesFromData(schools);
  const maxIssue = Math.max(1, ...issues.map((i) => i.count));

  const asOf = formatThaiDate(new Date());

  return (
    <div className="strategy-page">
      <PageBanner
        src={PAGE_BANNERS.strategy}
        title="ผลการประเมินตามระบบ SMS"
        subtitle={`ข้อมูลภาพรวม ${schools.length.toLocaleString('th-TH')} โรงเรียนในโครงการกองทุนการศึกษา`}
        quote="“การศึกษา คือพลังในการเปลี่ยนแปลงสังคม”"
        quoteMeta={`ข้อมูล ณ วันที่ ${asOf}`}
      />

      <div className="page-shell space-y-5 py-5">
        <div className="schools-list-panel schools-list-panel--five space-y-5">
        <div className="ed-strategy-row">
          {STRATEGY_LABELS.map((s, i) => {
            const score = avgs[i] ?? 0;
            const st = statusFromScore(score);
            return (
              <article key={s.key} className="ed-card strategy-metric">
                <div className="strategy-metric__head">
                  <span className="strategy-metric__icon" style={{ background: s.color }}>
                    {i + 1}
                  </span>
                  <strong>{s.label}</strong>
                </div>
                <div className="strategy-metric__score">
                  {score.toFixed(2)}
                  <span> / 5.00</span>
                </div>
                <span className="ed-badge" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
                <div className="strategy-metric__meta text-xs text-slate-500">
                  จาก {schools.length.toLocaleString('th-TH')} โรงเรียน (รอบประเมินล่าสุด)
                </div>
              </article>
            );
          })}
        </div>

        <div className="ed-analytics-row">
          <section className="ed-card p-4">
            <h2 className="ed-section-title text-base">คะแนนเฉลี่ยผลการประเมินตามระบบ SMS</h2>
            <p className="text-sm text-slate-600 m-0 mb-2">
              คะแนนเฉลี่ยรวมตามระบบ SMS{' '}
              <strong className="text-tm-blue">{overallAvg.toFixed(2)}</strong>
              <span className="text-slate-400"> / 5.00</span>
            </p>
            <DualRadarChart
              labels={labels}
              schoolScores={avgs}
              schoolLabel="ค่าเฉลี่ยโครงการ"
              showNational={false}
            />
          </section>

          <section className="ed-card p-4 space-y-3">
            <h2 className="ed-section-title text-base">การกระจายของโรงเรียนในแต่ละระดับ</h2>
            {STRATEGY_LABELS.map((s) => {
              const t = tierCounts(schools, s.key);
              const total = Math.max(
                1,
                DEV_STATUS_ORDER.reduce((sum, k) => sum + t[k], 0)
              );
              const tiers = [...DEV_STATUS_ORDER].reverse().map((key) => ({
                key,
                count: t[key],
                color: DEV_STATUS[key].color,
                label: DEV_STATUS[key].label,
              }));
              return (
                <div key={s.key}>
                  <div className="text-xs font-semibold mb-1 text-slate-600">{s.label}</div>
                  <div className="ed-stack-bar ed-stack-bar--labeled">
                    {tiers.map((row) =>
                      row.count > 0 ? (
                        <span
                          key={row.key}
                          style={{ flex: row.count / total, background: row.color }}
                          title={`${row.label}: ${row.count}`}
                        >
                          {row.count}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              );
            })}
            <div className="strategy-legend">
              {[...DEV_STATUS_ORDER].reverse().map((key) => (
                <span key={key}>
                  <i style={{ background: DEV_STATUS[key].color }} />
                  {DEV_STATUS[key].label}
                </span>
              ))}
            </div>
          </section>

          <section className="ed-card p-4 space-y-3">
            <h2 className="ed-section-title text-base">สรุปสถานการณ์</h2>
            <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
              <strong className="text-emerald-800 text-sm">จุดแข็งภาพรวม</strong>
              <ul className="text-sm text-emerald-900 m-0 mt-1 pl-4">
                {strengths.length ? (
                  strengths.map((s) => (
                    <li key={s.key}>
                      {s.label} ({s.score.toFixed(2)})
                    </li>
                  ))
                ) : (
                  <li>ยังไม่มีข้อมูลคะแนน</li>
                )}
              </ul>
            </div>
            <div className="rounded-xl p-3 bg-orange-50 border border-orange-100">
              <strong className="text-orange-800 text-sm">ประเด็นที่ควรให้ความสำคัญ</strong>
              <ul className="text-sm text-orange-900 m-0 mt-1 pl-4">
                {priorities.length ? (
                  priorities.map((s) => (
                    <li key={s.key}>
                      {s.label} ({s.score.toFixed(2)})
                    </li>
                  ))
                ) : (
                  <li>ยังไม่มีข้อมูลคะแนน</li>
                )}
              </ul>
            </div>
            <div className="rounded-xl p-3 bg-blue-50 border border-blue-100">
              <strong className="text-tm-blue text-sm">แนวโน้มโดยรวม</strong>
              <p className="text-sm text-slate-700 m-0 mt-1">
                คะแนนเฉลี่ยรวม {overallAvg.toFixed(2)} · โรงเรียนยอดเยี่ยม{' '}
                {excellentShare.toFixed(1)}%
              </p>
            </div>
          </section>
        </div>

        <div className="ed-bottom-row">
          <section className="ed-card p-4">
            <h2 className="ed-section-title text-base">ประเด็นที่พบร่วมกันมากที่สุด (Top 5)</h2>
            <p className="text-xs text-slate-500 m-0 mb-2">
              จำนวนโรงเรียนในระดับควรพัฒนา / พอใช้ แยกตามกลยุทธ์
            </p>
            <ul className="space-y-2 m-0 p-0 list-none">
              {issues.map((item) => (
                <li key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / maxIssue) * 100}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="ed-card p-4 space-y-3">
            <h2 className="ed-section-title text-base">แผนที่แสดงคะแนนรวมรายจังหวัด</h2>
            <div className="strategy-map-thumb">
              <MapIcon size={28} />
              <p>ภาพรวมคะแนนรายจังหวัด</p>
            </div>
            <div>
              <strong className="text-sm">Top 5 จังหวัด</strong>
              <ol className="m-0 mt-2 pl-4 space-y-1 text-sm">
                {topProvinces.length ? (
                  topProvinces.map((p) => (
                    <li key={p.name}>
                      {p.name} · {p.avg.toFixed(2)}
                    </li>
                  ))
                ) : (
                  <li>ยังไม่มีข้อมูล</li>
                )}
              </ol>
            </div>
            <Link href="/thailand-map" prefetch className="ed-btn ed-btn--primary ed-btn--sm">
              ดูแผนที่เต็มหน้าจอ
            </Link>
          </section>

          <section className="ed-card p-4 space-y-2">
            <h2 className="ed-section-title text-base">ลิงก์ด่วน</h2>
            {[
              { href: '/schools', label: 'ดูโรงเรียนตามกลยุทธ์', icon: ArrowRight },
              { href: '/thailand-map', label: 'แผนที่โรงเรียน', icon: MapIcon },
              { href: '/about', label: 'เกี่ยวกับโครงการ', icon: FileText },
              { href: '/schools', label: 'รายชื่อโรงเรียน', icon: Download },
            ].map((l) => (
              <Link key={l.label} href={l.href} prefetch className="ed-quick-link">
                <l.icon size={16} />
                {l.label}
                <ArrowRight size={14} className="ml-auto opacity-50" />
              </Link>
            ))}
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<StrategySkeleton />}>
      <StrategyBody />
    </Suspense>
  );
}
