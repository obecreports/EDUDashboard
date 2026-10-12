import { PageBanner } from '@/components/layout/PageBanner';
import { PAGE_BANNERS } from '@/lib/types';
import { PillarsOverviewClient } from '@/components/pillars/PillarsOverviewClient';
import {
  EMPTY_PILLAR_INDICATORS,
  EMPTY_PILLAR_OVERVIEW,
  THREE_PILLAR_LABELS,
} from '@/lib/mock/pillars';
import { fetchSchools } from '@/lib/supabase/schools';
import { fetchAllPillarScores, indicatorScoresFromRow } from '@/lib/supabase/school-pillars';

export const dynamic = 'force-dynamic';

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export default async function PillarsPage() {
  const [schools, pillarMap] = await Promise.all([
    fetchSchools().catch(() => []),
    fetchAllPillarScores(),
  ]);

  const scored = schools
    .map((s) => s.threePillarScores)
    .filter(
      (t) => t && (t.qualitySchool > 0 || t.qualityGraduation > 0 || t.disciplineMorality > 0)
    );

  const qualitySchool = avg(scored.map((t) => t!.qualitySchool));
  const qualityGraduation = avg(scored.map((t) => t!.qualityGraduation));
  const disciplineMorality = avg(scored.map((t) => t!.disciplineMorality));
  const overall = avg(scored.map((t) => t!.overall));

  const overview = {
    ...EMPTY_PILLAR_OVERVIEW,
    qualitySchool,
    qualityGraduation,
    disciplineMorality,
    overall,
    yearCompare: {
      ...EMPTY_PILLAR_OVERVIEW.yearCompare,
      curr: { qualitySchool, qualityGraduation, disciplineMorality, overall },
    },
  };

  // Aggregate indicator averages from DB rows (or empty defs)
  const rows = [...pillarMap.values()];
  let indicators = EMPTY_PILLAR_INDICATORS;
  if (rows.length) {
    const mapped = rows.map((r) => indicatorScoresFromRow(r));
    const keys = ['qualitySchool', 'qualityGraduation', 'disciplineMorality'] as const;
    indicators = Object.fromEntries(
      keys.map((k) => [
        k,
        EMPTY_PILLAR_INDICATORS[k].map((def, i) => ({
          ...def,
          score: avg(mapped.map((m) => m[k][i]?.score ?? 0).filter((n) => n > 0)),
        })),
      ])
    ) as typeof EMPTY_PILLAR_INDICATORS;

    // Top / bottom indicators for highlights
    const flat = keys.flatMap((k) =>
      indicators[k].map((ind) => ({ ...ind, pillar: THREE_PILLAR_LABELS[k] }))
    );
    const withScore = flat.filter((f) => f.score > 0).sort((a, b) => b.score - a.score);
    overview.strengths = withScore.slice(0, 3).map((f) => `${f.code} ${f.label}`);
    overview.opportunities = withScore
      .slice()
      .reverse()
      .slice(0, 3)
      .map((f) => `${f.code} ${f.label}`);
  }

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.pillars}
        title="ภาพรวม 3 เสาหลัก โครงการกองทุนการศึกษา"
        subtitle="สร้างคนดีให้บ้านเมือง · การศึกษาคือพลังของการเปลี่ยนแปลง"
      />
      <div className="page-shell py-6">
        <PillarsOverviewClient
          overview={overview}
          labels={THREE_PILLAR_LABELS}
          indicators={indicators}
        />
      </div>
    </div>
  );
}
