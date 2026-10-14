'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/** Default national/regional averages for G01–G05 pillars */
export const NATIONAL_PILLAR_AVG = [3.85, 3.7, 3.9, 3.65, 3.6];

export function DualRadarChart({
  labels,
  schoolScores,
  nationalScores = NATIONAL_PILLAR_AVG,
  schoolLabel = 'โรงเรียนนี้',
  nationalLabel = 'ค่าเฉลี่ยประเทศ / ภูมิภาค',
  showNational = true,
  maxScale = 5,
  /** Explicit tick values (e.g. [0, 50, 100]) — avoids overlapping labels */
  tickValues,
}: {
  labels: string[];
  schoolScores: number[];
  nationalScores?: number[];
  schoolLabel?: string;
  nationalLabel?: string;
  /** When false, only the average / school series is drawn */
  showNational?: boolean;
  maxScale?: number;
  tickValues?: number[];
}) {
  const compareSeries = showNational
    ? [
        {
          label: nationalLabel,
          data: nationalScores.map((n) => Number(n.toFixed(2))),
          backgroundColor: 'rgba(41, 86, 143, 0.12)',
          borderColor: '#29568f',
          borderWidth: 2,
          borderDash: [5, 4],
          pointBackgroundColor: '#29568f',
        },
      ]
    : [];

  const data = {
    labels,
    datasets: [
      ...compareSeries,
      {
        label: schoolLabel,
        data: schoolScores.map((n) => Number(n.toFixed(2))),
        backgroundColor: 'rgba(0, 198, 160, 0.22)',
        borderColor: '#00c6a0',
        borderWidth: 2.5,
        pointBackgroundColor: '#00c6a0',
      },
    ],
  };

  return (
    <div className="w-full" style={{ height: 320 }}>
      <Radar
        data={data}
        options={{
          scales: {
            r: {
              min: 0,
              max: maxScale,
              ticks: tickValues
                ? {
                    stepSize: tickValues.length > 1 ? tickValues[1]! - tickValues[0]! : maxScale / 2,
                    count: tickValues.length,
                    callback: (value) => {
                      const n = typeof value === 'number' ? value : Number(value);
                      return tickValues.includes(n) ? String(n) : '';
                    },
                  }
                : { stepSize: maxScale <= 5 ? 1 : 20 },
              pointLabels: { font: { size: 11 } },
            },
          },
          plugins: {
            legend: { position: 'bottom' },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
