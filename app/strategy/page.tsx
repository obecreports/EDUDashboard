import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Download, FileText, Map as MapIcon } from 'lucide-react';
import { fetchSchools } from '@/lib/supabase/schools';
import { DualRadarChart } from '@/components/schools/SchoolRadarChart';
import { PageBanner } from '@/components/layout/PageBanner';
import { StrategySkeleton } from '@/components/ui/PageSkeleton';
import { PAGE_BANNERS, type SchoolFull } from '@/lib/types';
import { statusFromScore, STRATEGY_LABELS, DEV_STATUS } from '@/lib/theme/status';

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
  const buckets = { strong: 0, progressing: 0, accelerate: 0, urgent: 0 };
  list.forEach((s) => {
    const st = statusFromScore(s.pillarScores?.[key]);
    buckets[st.key] += 1;
  });
  return buckets;
}

/** Top issues = strategies with the most schools in urgent/accelerate tiers */
function topIssuesFromData(list: SchoolFull[]) {
  return STRATEGY_LABELS.map((s) => {
    const weak = list.filter((school) => {
      const st = statusFromScore(school.pillarScores?.[s.key]);
      return st.key === 'urgent' || st.key === 'accelerate';
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
  const strongShare =
    (schools.filter((s) => statusFromScore(s.overallScore).key === 'strong').length / n) * 100;

  const ranked = STRATEGY_LABELS.map((s, i) => ({ ...s, score: avgs[i] ?? 0 })).sort(
    (a, b) => b.score - a.score
  );
  const strengths = ranked.filter((s) => s.score > 0).slice(0, 2);
  const priorities = [...ranked].filter((s) => s.score > 0).sort((a, b) => a.score - b.score).slice(0, 2);
  const issues = topIssuesFromData(schools);
  const maxIssue = Math.max(1, ...issues.map((i) => i.count));

  const asOf = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="strategy-page">
      <PageBanner
        src={PAGE_BANNERS.strategy}
        title="ภาพรวมการดำเนินงานตาม 5 กลยุทธ์"
        subtitle={`ข้อมูลภาพรวม ${schools.length.toLocaleString('th-TH')} โรงเรียนในโครงการกองทุนการศึกษา`}
        quote="“การศึกษา คือพลังในการเปลี่ยนแปลงสังคม”"
        quoteMeta={`ข้อมูล ณ วันที่ ${asOf}`}
      />

      <div className="page-shell space-y-5 py-5">
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
            <h2 className="ed-section-title text-base">คะแนนเฉลี่ย 5 กลยุทธ์</h2>
            <DualRadarChart
              labels={labels}
              schoolScores={avgs}
              nationalScores={[5, 5, 5, 5, 5]}
              schoolLabel="ค่าเฉลี่ยโครงการ"
              nationalLabel="คะแนนเต็ม"
            />
          </section>

          <section className="ed-card p-4 space-y-3">
            <h2 className="ed-section-title text-base">การกระจายของโรงเรียนในแต่ละระดับ</h2>
            {STRATEGY_LABELS.map((s) => {
              const t = tierCounts(schools, s.key);
              const total = Math.max(1, t.strong + t.progressing + t.accelerate + t.urgent);
              return (
                <div key={s.key}>
                  <div className="text-xs font-semibold mb-1 text-slate-600">{s.label}</div>
                  <div className="ed-stack-bar ed-stack-bar--labeled">
                    {(
                      [
                        ['strong', t.strong],
                        ['progressing', t.progressing],
                        ['accelerate', t.accelerate],
                        ['urgent', t.urgent],
                      ] as const
                    ).map(([key, count]) =>
                      count > 0 ? (
                        <span
                          key={key}
                          style={{ flex: count / total, background: DEV_STATUS[key].color }}
                          title={`${DEV_STATUS[key].label}: ${count}`}
                        >
                          {count}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              );
            })}
            <div className="strategy-legend">
              {(Object.keys(DEV_STATUS) as (keyof typeof DEV_STATUS)[]).map((k) => (
                <span key={k}>
                  <i style={{ background: DEV_STATUS[k].color }} />
                  {DEV_STATUS[k].label}
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
                คะแนนเฉลี่ยรวม {overallAvg.toFixed(2)} · โรงเรียนเข้มแข็ง {strongShare.toFixed(1)}%
              </p>
            </div>
          </section>
        </div>

        <div className="ed-bottom-row">
          <section className="ed-card p-4">
            <h2 className="ed-section-title text-base">ประเด็นที่พบร่วมกันมากที่สุด (Top 5)</h2>
            <p className="text-xs text-slate-500 m-0 mb-2">
              จำนวนโรงเรียนในระดับควรเร่งพัฒนา / ต้องติดตาม แยกตามกลยุทธ์
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
  );
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<StrategySkeleton />}>
      <StrategyBody />
    </Suspense>
  );
}
