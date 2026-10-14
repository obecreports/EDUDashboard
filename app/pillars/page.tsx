import { PageBanner } from '@/components/layout/PageBanner';
import { PAGE_BANNERS } from '@/lib/types';
import { PillarsOverviewClient } from '@/components/pillars/PillarsOverviewClient';
import {
  EMPTY_PILLAR_INDICATORS,
  EMPTY_PILLAR_OVERVIEW,
  THREE_PILLAR_LABELS,
} from '@/lib/mock/pillars';
import {
  fetchAllPillarScores,
  indicatorScoresFromRow,
  mapPillarRow,
  type SchoolPillarScoreRow,
} from '@/lib/supabase/school-pillars';
import {
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
  scoreYearToBeLabel,
} from '@/lib/scores/years';

export const dynamic = 'force-dynamic';

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function avgPillarsFromMap(pillarMap: Map<string, SchoolPillarScoreRow>) {
  const scored = [...pillarMap.values()]
    .map((row) => mapPillarRow(row))
    .filter((t) => t.qualitySchool > 0 || t.qualityGraduation > 0 || t.disciplineMorality > 0);
  return {
    qualitySchool: avg(scored.map((t) => t.qualitySchool)),
    qualityGraduation: avg(scored.map((t) => t.qualityGraduation)),
    disciplineMorality: avg(scored.map((t) => t.disciplineMorality)),
    overall: avg(scored.map((t) => t.overall)),
  };
}

export default async function PillarsPage() {
  const [pillarMap, pillarPrevMap] = await Promise.all([
    fetchAllPillarScores(SCORE_YEAR_CURRENT),
    fetchAllPillarScores(SCORE_YEAR_PREVIOUS),
  ]);

  const curr = avgPillarsFromMap(pillarMap);
  const prev = avgPillarsFromMap(pillarPrevMap);

  const overview = {
    ...EMPTY_PILLAR_OVERVIEW,
    qualitySchool: curr.qualitySchool,
    qualityGraduation: curr.qualityGraduation,
    disciplineMorality: curr.disciplineMorality,
    overall: curr.overall,
    yearCompare: {
      prev,
      curr,
      prevLabel: scoreYearToBeLabel(SCORE_YEAR_PREVIOUS),
      currLabel: scoreYearToBeLabel(SCORE_YEAR_CURRENT),
    },
  };

  // Aggregate indicator averages from current-year DB rows
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
