'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

type Overview = {
  qualitySchool: number;
  qualityGraduation: number;
  disciplineMorality: number;
  overall: number;
  yearCompare: {
    prev: { qualitySchool: number; qualityGraduation: number; disciplineMorality: number; overall: number };
    curr: { qualitySchool: number; qualityGraduation: number; disciplineMorality: number; overall: number };
    prevLabel: string;
    currLabel: string;
  };
  strengths: string[];
  opportunities: string[];
};

const COLORS = {
  p1: '#0b4da2',
  p2: '#059669',
  p3: '#ea580c',
  total: '#1e3a8a',
};

function Gauge({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const data = {
    labels: ['score', 'rest'],
    datasets: [
      {
        data: [pct, 100 - pct],
        backgroundColor: [color, '#e2e8f0'],
        borderWidth: 0,
        cutout: '72%',
      },
    ],
  };
  return (
    <div className="ed-card p-4 grid gap-3 text-center">
      <h3 className="font-bold text-sm m-0" style={{ color }}>
        {label}
      </h3>
      <div className="relative mx-auto" style={{ width: 140, height: 140 }}>
        <Doughnut
          data={data}
          options={{
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            responsive: true,
            maintainAspectRatio: true,
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <div className="text-2xl font-extrabold" style={{ color }}>
              {value.toFixed(1)}
            </div>
            <div className="text-xs text-slate-400">/ 100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PillarsOverviewClient({
  overview,
  labels,
  indicators,
}: {
  overview: Overview;
  labels: Record<'qualitySchool' | 'qualityGraduation' | 'disciplineMorality', string>;
  indicators: Record<
    'qualitySchool' | 'qualityGraduation' | 'disciplineMorality',
    { code?: string; label: string; score: number }[]
  >;
}) {
  const barData = {
    labels: [labels.qualitySchool, labels.qualityGraduation, labels.disciplineMorality, 'คะแนนรวม'],
    datasets: [
      {
        label: overview.yearCompare.prevLabel,
        data: [
          overview.yearCompare.prev.qualitySchool,
          overview.yearCompare.prev.qualityGraduation,
          overview.yearCompare.prev.disciplineMorality,
          overview.yearCompare.prev.overall,
        ],
        backgroundColor: '#93c5fd',
      },
      {
        label: overview.yearCompare.currLabel,
        data: [
          overview.yearCompare.curr.qualitySchool,
          overview.yearCompare.curr.qualityGraduation,
          overview.yearCompare.curr.disciplineMorality,
          overview.yearCompare.curr.overall,
        ],
        backgroundColor: '#0b4da2',
      },
    ],
  };

  const yc = overview.yearCompare;
  const radarData = {
    labels: [labels.qualitySchool, labels.qualityGraduation, labels.disciplineMorality],
    datasets: [
      {
        label: `ปี ${yc.prevLabel}`,
        data: [yc.prev.qualitySchool, yc.prev.qualityGraduation, yc.prev.disciplineMorality],
        backgroundColor: 'rgba(147,197,253,0.25)',
        borderColor: '#93c5fd',
        borderDash: [5, 4],
        pointBackgroundColor: '#93c5fd',
      },
      {
        label: `ปี ${yc.currLabel}`,
        data: [yc.curr.qualitySchool, yc.curr.qualityGraduation, yc.curr.disciplineMorality],
        backgroundColor: 'rgba(11,77,162,0.2)',
        borderColor: '#0b4da2',
        pointBackgroundColor: '#0b4da2',
      },
    ],
  };

  const pillarCards: {
    key: 'qualitySchool' | 'qualityGraduation' | 'disciplineMorality';
    color: string;
  }[] = [
    { key: 'qualitySchool', color: COLORS.p1 },
    { key: 'qualityGraduation', color: COLORS.p2 },
    { key: 'disciplineMorality', color: COLORS.p3 },
  ];

  return (
    <div className="grid gap-5 schools-list-panel schools-list-panel--three">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {pillarCards.map(({ key, color }) => (
          <div key={key} className="grid gap-2">
            <Gauge value={overview[key]} color={color} label={labels[key]} />
            <ul className="ed-card p-3 m-0 list-none grid gap-1.5 text-xs">
              {indicators[key].map((ind) => (
                <li key={ind.code ?? ind.label} className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    {ind.code ? (
                      <span className="font-semibold text-slate-800 mr-1">{ind.code}</span>
                    ) : null}
                    {ind.label}
                  </span>
                  <strong style={{ color }}>{ind.score.toFixed(0)}</strong>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="ed-card p-4 grid place-content-center text-center text-white" style={{ background: COLORS.total }}>
          <div className="text-sm opacity-90">คะแนนเทียบเคียงรวม</div>
          <div className="text-4xl font-extrabold my-2">{yc.curr.overall.toFixed(1)}</div>
          <div className="text-xs opacity-80">ปี {yc.currLabel} · / 100</div>
          <div className="text-sm mt-3 opacity-95 border-t border-white/25 pt-2">
            ปี {yc.prevLabel}: <strong>{yc.prev.overall.toFixed(1)}</strong>
            {yc.prev.overall > 0 || yc.curr.overall > 0 ? (
              <span className="ml-2 opacity-90">
                ({yc.curr.overall - yc.prev.overall >= 0 ? '+' : ''}
                {(yc.curr.overall - yc.prev.overall).toFixed(1)})
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pillars-charts-row">
        <div className="ed-card p-4">
          <h3 className="font-bold text-tm-blue mb-3">
            เปรียบเทียบคะแนนรายเสาหลัก ปี {yc.prevLabel}–{yc.currLabel}
          </h3>
          <div className="pillars-chart-tall">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { min: 0, max: 100 } },
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </div>
        <div className="ed-card p-4">
          <h3 className="font-bold text-tm-blue mb-3">เปรียบเทียบคะแนน 3 เสาหลัก</h3>
          <div className="pillars-chart-tall pillars-chart-tall--radar">
            <Radar
              data={radarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    min: 0,
                    max: 100,
                    ticks: {
                      stepSize: 50,
                      callback: (value) => {
                        const n = typeof value === 'number' ? value : Number(value);
                        return n === 0 || n === 50 || n === 100 ? String(n) : '';
                      },
                    },
                    pointLabels: { font: { size: 12 } },
                  },
                },
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="ed-card p-4 grid gap-4">
        <h3 className="font-bold text-tm-blue m-0">จุดเด่นและโอกาสพัฒนา</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm font-semibold text-emerald-700 mb-2">จุดแข็ง</div>
            <ul className="m-0 p-0 list-none grid gap-1.5">
              {overview.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-orange-700 mb-2">โอกาสพัฒนา</div>
            <ul className="m-0 p-0 list-none grid gap-1.5">
              {overview.opportunities.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
