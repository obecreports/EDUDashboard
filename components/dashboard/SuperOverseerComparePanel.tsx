'use client';

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronDown } from 'lucide-react';
import type { PillarScores, SchoolFull, ThreePillarScores } from '@/lib/types';
import type { CompareScoresByYear } from '@/lib/types';
import {
  HierarchicalFilterDropdown,
  type FilterTreeNode,
} from '@/components/ui/HierarchicalFilterDropdown';
import { THREE_PILLAR_LABELS, type ThreePillarKey } from '@/lib/mock/pillars';
import { STRATEGY_LABELS } from '@/lib/theme/status';
import {
  SCORE_YEAR_CURRENT,
  SCORE_YEAR_PREVIOUS,
  scoreYearToBeLabel,
} from '@/lib/scores/years';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PILLAR_KEYS: ThreePillarKey[] = [
  'qualitySchool',
  'qualityGraduation',
  'disciplineMorality',
];

const PILLAR_SHORT: Record<ThreePillarKey, string> = {
  qualitySchool: 'เสาหลัก 1',
  qualityGraduation: 'เสาหลัก 2',
  disciplineMorality: 'เสาหลัก 3',
};

const ANGLE_KEYS = STRATEGY_LABELS.map((s) => s.key);
type AngleKey = (typeof ANGLE_KEYS)[number];

const YEAR_OPTIONS = [
  { ce: SCORE_YEAR_PREVIOUS, label: scoreYearToBeLabel(SCORE_YEAR_PREVIOUS) },
  { ce: SCORE_YEAR_CURRENT, label: scoreYearToBeLabel(SCORE_YEAR_CURRENT) },
] as const;

const SCHOOL_COLORS = [
  '#0b4da2',
  '#c05621',
  '#047857',
  '#7c3aed',
  '#be123c',
  '#0e7490',
  '#a16207',
  '#4338ca',
  '#c2410c',
  '#15803d',
  '#db2777',
  '#0369a1',
  '#4d7c0f',
  '#9f1239',
  '#1d4ed8',
];

const MAX_COMPARE_SCHOOLS = 15;

function areaOf(s: SchoolFull) {
  return s.area_name || s.Gov_Domain?.area_name || s.district || 'ไม่ระบุเขต';
}

function provinceOf(s: SchoolFull) {
  return s.province || 'ไม่ระบุจังหวัด';
}

function emptyThree(): ThreePillarScores {
  return { qualitySchool: 0, qualityGraduation: 0, disciplineMorality: 0, overall: 0 };
}

function emptySms(): PillarScores {
  return {
    learner: 0,
    participation: 0,
    teacherAdmin: 0,
    curriculum: 0,
    infrastructure: 0,
  };
}

/** Truncate Thai school names for axis / in-chart labels. */
function schoolAxisLabel(name: string, maxChars = 16) {
  const t = (name || '').trim() || 'โรงเรียน';
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

type ChartLegendItem = {
  text: string;
  fillStyle: string;
};

type ChartDataExtras = {
  fullLabels?: string[];
  /** When set, bottom legend lists these (e.g. full school names) instead of datasets. */
  legendItems?: ChartLegendItem[];
};

function interactiveBarOptions(
  max?: number,
  opts?: { showLegend?: boolean; rotateSchoolLabels?: boolean }
): ChartOptions<'bar'> {
  const showLegend = opts?.showLegend ?? true;
  const rotateSchoolLabels = opts?.rotateSchoolLabels ?? false;
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: rotateSchoolLabels ? { padding: { bottom: 8 } } : undefined,
    plugins: {
      legend: showLegend
        ? {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'rectRounded',
              boxWidth: 12,
              boxHeight: 12,
              padding: 12,
              font: { size: 10, weight: 700 },
              generateLabels(chart) {
                const extras = chart.data as ChartDataExtras;
                if (extras.legendItems?.length) {
                  return extras.legendItems.map((item, i) => ({
                    text: item.text,
                    fillStyle: item.fillStyle,
                    strokeStyle: item.fillStyle,
                    lineWidth: 0,
                    hidden: false,
                    datasetIndex: 0,
                    index: i,
                    fontColor: '#334155',
                  }));
                }
                const datasets = chart.data.datasets;
                return datasets.map((ds, i) => {
                  const meta = chart.getDatasetMeta(i);
                  const short =
                    (ds as { shortLabel?: string }).shortLabel ||
                    String(ds.label ?? `ชุด ${i + 1}`);
                  return {
                    text: short,
                    fillStyle: String(ds.backgroundColor ?? '#94a3b8'),
                    strokeStyle: String(
                      ds.borderColor ?? ds.backgroundColor ?? '#94a3b8'
                    ),
                    lineWidth: 0,
                    hidden: meta.hidden === true,
                    datasetIndex: i,
                    fontColor: '#334155',
                  };
                });
              },
            },
            onClick(_e, legendItem, legend) {
              const extras = legend.chart.data as ChartDataExtras;
              // Custom school legend is display-only (one shared dataset).
              if (extras.legendItems?.length) return;
              const index = legendItem.datasetIndex;
              if (index == null) return;
              const chart = legend.chart;
              const visible = chart.isDatasetVisible(index);
              chart.setDatasetVisibility(index, !visible);
              chart.update();
            },
          }
        : { display: false },
      tooltip: {
        callbacks: {
          title(items) {
            const idx = items[0]?.dataIndex;
            const chart = items[0]?.chart;
            if (idx == null || !chart) return '';
            // Prefer names on the dataset (Chart.js keeps custom dataset fields).
            const fromDs = (
              items[0]?.dataset as { schoolNames?: string[] } | undefined
            )?.schoolNames?.[idx];
            if (fromDs) return fromDs;
            const fullLabels = (chart.data as ChartDataExtras).fullLabels;
            if (fullLabels?.[idx]) return fullLabels[idx];
            const labels = chart.data.labels;
            if (!labels) return '';
            const raw = labels[idx];
            return typeof raw === 'string' ? raw : String(raw ?? '');
          },
          label(ctx) {
            const full =
              (ctx.dataset as { fullLabel?: string }).fullLabel ||
              ctx.dataset.label ||
              '';
            const v = ctx.parsed.y;
            const num =
              typeof v === 'number'
                ? v.toLocaleString('th-TH', { maximumFractionDigits: 2 })
                : String(v ?? '');
            return `${full}: ${num}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: rotateSchoolLabels ? 55 : 0,
          minRotation: rotateSchoolLabels ? 35 : 0,
          autoSkip: !rotateSchoolLabels,
          font: { size: rotateSchoolLabels ? 9 : 11, weight: 600 },
        },
      },
      y: {
        beginAtZero: true,
        ...(max != null ? { max } : {}),
      },
    },
  };
}

export function SuperOverseerComparePanel({
  schools,
  scoresByYear = {},
}: {
  schools: SchoolFull[];
  scoresByYear?: CompareScoresByYear;
}) {
  const [selectedYears, setSelectedYears] = useState<Set<string>>(
    () => new Set([SCORE_YEAR_PREVIOUS, SCORE_YEAR_CURRENT])
  );
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(() => new Set());
  const [selectedPillars, setSelectedPillars] = useState<Set<ThreePillarKey>>(
    () => new Set(PILLAR_KEYS)
  );
  const [selectedAngles, setSelectedAngles] = useState<Set<AngleKey>>(
    () => new Set(ANGLE_KEYS)
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const placeTree = useMemo((): FilterTreeNode[] => {
    const byProv = new Map<string, Map<string, SchoolFull[]>>();
    for (const s of schools) {
      const province = provinceOf(s);
      const area = areaOf(s);
      if (!byProv.has(province)) byProv.set(province, new Map());
      const areaMap = byProv.get(province)!;
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(s);
    }
    return [...byProv.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'th'))
      .map(([province, areaMap]) => ({
        id: `p:${province}`,
        label: province,
        hint: 'จังหวัด',
        children: [...areaMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], 'th'))
          .map(([area, list]) => ({
            id: `a:${province}||${area}`,
            label: area,
            hint: 'เขตพื้นที่',
            children: list
              .slice()
              .sort((a, b) => a.school_name_th.localeCompare(b.school_name_th, 'th'))
              .map((s) => ({
                id: `s:${s.school_id}`,
                label: s.school_name_th,
                hint: 'โรงเรียน',
              })),
          })),
      }));
  }, [schools]);

  const filtered = useMemo(() => {
    if (selectedPlaces.size === 0) return schools;
    return schools.filter((s) => {
      const province = provinceOf(s);
      const area = areaOf(s);
      const sid = String(s.school_id);
      return (
        selectedPlaces.has(`p:${province}`) ||
        selectedPlaces.has(`a:${province}||${area}`) ||
        selectedPlaces.has(`s:${sid}`)
      );
    });
  }, [schools, selectedPlaces]);

  const activeYears = useMemo(() => {
    if (selectedYears.size === 0) {
      return YEAR_OPTIONS.map((y) => y.ce);
    }
    return YEAR_OPTIONS.map((y) => y.ce).filter((ce) => selectedYears.has(ce));
  }, [selectedYears]);

  /** Schools used for school-vs-school series (capped). Prefer explicitly picked schools. */
  const compareSchools = useMemo(() => {
    const explicitIds = [...selectedPlaces].filter((id) => id.startsWith('s:'));
    let pool = filtered;
    if (explicitIds.length > 0) {
      const idSet = new Set(explicitIds.map((id) => id.slice(2)));
      pool = filtered.filter((s) => idSet.has(String(s.school_id)));
    }
    return [...pool]
      .sort(
        (a, b) =>
          (b.studentSummary?.totalStudents ?? 0) - (a.studentSummary?.totalStudents ?? 0)
      )
      .slice(0, MAX_COMPARE_SCHOOLS)
      .map((s, i) => ({
        school: s,
        code: `รร.${i + 1}`,
        axisLabel: schoolAxisLabel(s.school_name_th, 14),
        color: SCHOOL_COLORS[i % SCHOOL_COLORS.length]!,
      }));
  }, [filtered, selectedPlaces]);

  const pillarKeysActive = PILLAR_KEYS.filter((k) => selectedPillars.has(k));
  const angleKeysActive = ANGLE_KEYS.filter((k) => selectedAngles.has(k));

  const studentChart = useMemo(() => {
    const labels = compareSchools.map((c) => c.code);
    const schoolNames = compareSchools.map(
      (c) => c.school.school_name_th || c.code
    );
    return {
      labels,
      datasets: [
        {
          label: 'นักเรียน',
          shortLabel: 'นักเรียน',
          fullLabel: 'จำนวนนักเรียน',
          schoolNames,
          data: compareSchools.map((c) => c.school.studentSummary?.totalStudents ?? 0),
          backgroundColor: compareSchools.map((c) => c.color),
          borderRadius: 6,
        },
      ],
    };
  }, [compareSchools]);

  const staffChart = useMemo(() => {
    const labels = compareSchools.map((c) => c.code);
    const schoolNames = compareSchools.map(
      (c) => c.school.school_name_th || c.code
    );
    return {
      labels,
      datasets: [
        {
          label: 'บุคลากร',
          shortLabel: 'บุคลากร',
          fullLabel: 'จำนวนบุคลากร',
          schoolNames,
          data: compareSchools.map((c) => c.school.personnelSummary?.totalPersonnel ?? 0),
          backgroundColor: compareSchools.map((c) => c.color),
          borderRadius: 6,
        },
      ],
    };
  }, [compareSchools]);

  const schoolCodeKey =
    compareSchools.length > 0 ? (
      <ul className="so-compare__legend-key" aria-label="รหัสโรงเรียนในกราฟ">
        {compareSchools.map((c) => (
          <li key={String(c.school.school_id)}>
            <span
              className="so-compare__legend-swatch"
              style={{ background: c.color }}
              aria-hidden
            />
            <span className="so-compare__legend-code">{c.code}</span>
            <span className="so-compare__legend-name">
              {c.school.school_name_th || c.code}
            </span>
          </li>
        ))}
      </ul>
    ) : null;

  /** X = pillars; series = each school × selected year (school name on series). */
  const pillarChart = useMemo(() => {
    const labels = pillarKeysActive.map((k) => PILLAR_SHORT[k]);
    const datasets = compareSchools.flatMap((c) =>
      activeYears.map((ce, yi) => {
        const row = scoresByYear[ce]?.[String(c.school.school_id)];
        const three = row?.three ?? emptyThree();
        const yearLabel = scoreYearToBeLabel(ce);
        const name = schoolAxisLabel(c.school.school_name_th, 12);
        return {
          label: `${name} · ${yearLabel}`,
          shortLabel: `${name}·${yearLabel}`,
          fullLabel: `${c.school.school_name_th} · ปี ${yearLabel}`,
          data: pillarKeysActive.map((k) => three[k] ?? 0),
          backgroundColor: yi === 0 ? c.color : `${c.color}99`,
          borderColor: c.color,
          borderWidth: yi === 0 ? 0 : 1,
          borderRadius: 6,
        };
      })
    );
    return { labels, datasets };
  }, [compareSchools, activeYears, pillarKeysActive, scoresByYear]);

  /** X = angles; series = each school × year (school name on series). */
  const angleChart = useMemo(() => {
    const labels = angleKeysActive.map(
      (k) => STRATEGY_LABELS.find((s) => s.key === k)?.short ?? k
    );
    const datasets = compareSchools.flatMap((c) =>
      activeYears.map((ce, yi) => {
        const row = scoresByYear[ce]?.[String(c.school.school_id)];
        const sms = row?.sms ?? emptySms();
        const yearLabel = scoreYearToBeLabel(ce);
        const name = schoolAxisLabel(c.school.school_name_th, 12);
        return {
          label: `${name} · ${yearLabel}`,
          shortLabel: `${name}·${yearLabel}`,
          fullLabel: `${c.school.school_name_th} · ปี ${yearLabel}`,
          data: angleKeysActive.map((k) => sms[k] ?? 0),
          backgroundColor: yi === 0 ? c.color : `${c.color}99`,
          borderColor: c.color,
          borderWidth: yi === 0 ? 0 : 1,
          borderRadius: 6,
        };
      })
    );
    return { labels, datasets };
  }, [compareSchools, activeYears, angleKeysActive, scoresByYear]);

  const toggleYear = (ce: string) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(ce)) next.delete(ce);
      else next.add(ce);
      return next;
    });
  };

  const togglePillar = (k: ThreePillarKey) => {
    setSelectedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k);
      } else next.add(k);
      return next;
    });
  };

  const toggleAngle = (k: AngleKey) => {
    setSelectedAngles((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size > 1) next.delete(k);
      } else next.add(k);
      return next;
    });
  };

  const schoolAxisOpts = {
    showLegend: false,
    rotateSchoolLabels: false,
  } as const;

  return (
    <section className="so-compare ed-card p-4 space-y-4">
      <div>
        <button
          type="button"
          className="so-panel-toggle"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
        >
          <h2 className="ed-section-title text-base m-0 flex items-center gap-2">
            เปรียบเทียบข้อมูลโรงเรียน
            <ChevronDown
              size={18}
              className={`so-panel-toggle__chevron ${isExpanded ? 'is-open' : ''}`}
            />
          </h2>
        </button>
        <p className="text-sm text-slate-500 m-0 mt-1">
          เปรียบเทียบระดับโรงเรียน · ปี {scoreYearToBeLabel(SCORE_YEAR_PREVIOUS)} vs ปี{' '}
          {scoreYearToBeLabel(SCORE_YEAR_CURRENT)} · แสดงสูงสุด {MAX_COMPARE_SCHOOLS} รร. ·{' '}
          {filtered.length.toLocaleString('th-TH')} จาก {schools.length.toLocaleString('th-TH')} โรงเรียน
        </p>
      </div>

      {isExpanded ? (
      <>
      <div className="so-compare__filters">
        <div className="so-compare__chip-group" role="group" aria-label="ปีข้อมูล">
          <span className="so-compare__chip-label">ปี</span>
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y.ce}
              type="button"
              className={`so-compare__chip ${selectedYears.has(y.ce) || selectedYears.size === 0 ? 'is-active' : ''}`}
              onClick={() => toggleYear(y.ce)}
            >
              {y.label}
            </button>
          ))}
        </div>

        <HierarchicalFilterDropdown
          label="พื้นที่ / โรงเรียน"
          tree={placeTree}
          selected={selectedPlaces}
          onChange={setSelectedPlaces}
          emptyLabel="ทุกจังหวัด / เขต / โรงเรียน"
          className="so-compare__place"
        />

        <div className="so-compare__chip-group" role="group" aria-label="3 เสาหลัก">
          <span className="so-compare__chip-label">3 เสา</span>
          {PILLAR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              title={THREE_PILLAR_LABELS[k]}
              className={`so-compare__chip so-compare__chip--pillar ${selectedPillars.has(k) ? 'is-active' : ''}`}
              onClick={() => togglePillar(k)}
            >
              {PILLAR_SHORT[k]}
            </button>
          ))}
        </div>

        <div className="so-compare__chip-group" role="group" aria-label="SMS 5 ด้าน">
          <span className="so-compare__chip-label">SMS 5 ด้าน</span>
          {STRATEGY_LABELS.map((s) => (
            <button
              key={s.key}
              type="button"
              title={s.label}
              className={`so-compare__chip so-compare__chip--angle ${selectedAngles.has(s.key) ? 'is-active' : ''}`}
              onClick={() => toggleAngle(s.key)}
            >
              {s.short}
            </button>
          ))}
        </div>
      </div>

      <div className="so-compare__charts">
        <div className="so-compare__chart-card">
          <h3 className="so-compare__chart-title">เปรียบเทียบจำนวนนักเรียน</h3>
          <p className="so-compare__chart-hint">
            สูงสุด {MAX_COMPARE_SCHOOLS} รร.
          </p>
          <div className="so-compare__chart-body so-compare__chart-body--tall">
            <Bar data={studentChart} options={interactiveBarOptions(undefined, schoolAxisOpts)} />
          </div>
          {schoolCodeKey}
        </div>

        <div className="so-compare__chart-card">
          <h3 className="so-compare__chart-title">เปรียบเทียบจำนวนบุคลากร (ครู)</h3>
          <p className="so-compare__chart-hint">
            สูงสุด {MAX_COMPARE_SCHOOLS} รร.
          </p>
          <div className="so-compare__chart-body so-compare__chart-body--tall">
            <Bar data={staffChart} options={interactiveBarOptions(undefined, schoolAxisOpts)} />
          </div>
          {schoolCodeKey}
        </div>

        <div className="so-compare__chart-card so-compare__chart-card--pillars">
          <h3 className="so-compare__chart-title">เปรียบเทียบคะแนน 3 เสาหลัก</h3>
          <p className="so-compare__chart-hint">
           
          </p>
          <div className="so-compare__chart-body so-compare__chart-body--tall">
            <Bar data={pillarChart} options={interactiveBarOptions(100)} />
          </div>
        </div>

        <div className="so-compare__chart-card so-compare__chart-card--sms">
          <h3 className="so-compare__chart-title">เปรียบเทียบคะแนน SMS 5 ด้าน</h3>
          <p className="so-compare__chart-hint">
          
          </p>
          <div className="so-compare__chart-body so-compare__chart-body--tall">
            <Bar data={angleChart} options={interactiveBarOptions(5)} />
          </div>
        </div>
      </div>
      </>
      ) : null}
    </section>
  );
}
