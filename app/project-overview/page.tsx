import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PageBanner } from '@/components/layout/PageBanner';
import { ThailandMapClient } from '@/components/map/ThailandMapClient';
import { PillarsOverviewClient } from '@/components/pillars/PillarsOverviewClient';
import { StrategyOverviewSection } from '@/components/strategy/StrategyOverviewSection';
import { PageSkeleton, StrategySkeleton } from '@/components/ui/PageSkeleton';
import { canAccess } from '@/lib/auth/content-access';
import { getSessionProfile } from '@/lib/auth/session';
import { readContentAccessMapStored } from '@/lib/auth/user-store';
import {
  EMPTY_PILLAR_INDICATORS,
  EMPTY_PILLAR_OVERVIEW,
  THREE_PILLAR_LABELS,
} from '@/lib/mock/pillars';
import {
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
  scoreYearToBeLabel,
} from '@/lib/scores/years';
import { fetchSchools } from '@/lib/supabase/schools';
import {
  fetchAllPillarScores,
  indicatorScoresFromRow,
  mapPillarRow,
  type SchoolPillarScoreRow,
} from '@/lib/supabase/school-pillars';
import { PAGE_BANNERS, normalizeRole, type SchoolFull } from '@/lib/types';

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

async function MapSection({ schools, error }: { schools: SchoolFull[]; error: string | null }) {
  return (
    <section id="map" className="project-overview__section">
      <h2 className="ed-section-title text-lg m-0">แผนที่ประเทศไทย</h2>
      <p className="text-slate-500 mt-1 mb-4">
        คลิกจังหวัดบนแผนที่หรือจากรายละเอียดด้านข้าง · สลับมุมมองตามอำเภอ/เขตพื้นที่
        {schools.length ? ` · ${schools.length} โรงเรียน` : ''}
      </p>
      {error ? (
        <div className="panel-card text-red-700 bg-red-50">{error}</div>
      ) : (
        <ThailandMapClient schools={schools} />
      )}
    </section>
  );
}

async function PillarsSection() {
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
    <section id="pillars" className="project-overview__section">
      <h2 className="ed-section-title text-lg m-0 mb-4">
        ภาพรวม 3 เสาหลัก โครงการกองทุนการศึกษา
      </h2>
      <PillarsOverviewClient
        overview={overview}
        labels={THREE_PILLAR_LABELS}
        indicators={indicators}
      />
    </section>
  );
}

async function OverviewBody() {
  let schools: SchoolFull[] = [];
  let mapError: string | null = null;
  try {
    schools = await fetchSchools();
  } catch (e: unknown) {
    mapError = e instanceof Error ? e.message : 'Map data load failed';
  }

  return (
    <div className="page-shell py-6 space-y-10 project-overview">
      <MapSection schools={schools} error={mapError} />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <PillarsSection />
      </Suspense>
      <Suspense fallback={<StrategySkeleton />}>
        <StrategyOverviewSection schools={schools} embedded />
      </Suspense>
    </div>
  );
}

export default async function ProjectOverviewPage() {
  const [{ role }, acl] = await Promise.all([
    getSessionProfile(),
    readContentAccessMapStored(),
  ]);
  if (!canAccess(normalizeRole(role), 'project_overview', 'view', acl)) {
    redirect('/');
  }

  return (
    <div>
      <PageBanner
        src={PAGE_BANNERS.strategy}
        title="ภาพรวมโครงการ"
        subtitle="แผนที่ · 3 เสาหลัก · ผลการประเมินตามระบบ SMS"
        quote="“การศึกษา คือพลังในการเปลี่ยนแปลงสังคม”"
      />
      <Suspense fallback={<PageSkeleton rows={10} />}>
        <OverviewBody />
      </Suspense>
    </div>
  );
}
