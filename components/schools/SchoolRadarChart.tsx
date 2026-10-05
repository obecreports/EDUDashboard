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
}: {
  labels: string[];
  schoolScores: number[];
  nationalScores?: number[];
  schoolLabel?: string;
  nationalLabel?: string;
}) {
  const data = {
    labels,
    datasets: [
      {
        label: schoolLabel,
        data: schoolScores.map((n) => Number(n.toFixed(2))),
        backgroundColor: 'rgba(0, 198, 160, 0.22)',
        borderColor: '#00c6a0',
        borderWidth: 2.5,
        pointBackgroundColor: '#00c6a0',
      },
      {
        label: nationalLabel,
        data: nationalScores.map((n) => Number(n.toFixed(2))),
        backgroundColor: 'rgba(41, 86, 143, 0.12)',
        borderColor: '#29568f',
        borderWidth: 2,
        borderDash: [5, 4],
        pointBackgroundColor: '#29568f',
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
              suggestedMin: 0,
              suggestedMax: 5,
              ticks: { stepSize: 1 },
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
