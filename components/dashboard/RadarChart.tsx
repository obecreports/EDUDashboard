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

const pillarMap: Record<string, string> = {
  S: 'ด้านผู้เรียน',
  M: 'ด้านการมีส่วนร่วม',
  H: 'ด้านผู้สอน/ผู้บริหาร',
  C: 'ด้านหลักสูตร',
  D: 'ด้านโครงสร้างพื้นฐาน',
};

export function RadarChart({
  groups,
}: {
  groups: { pillar: string; avg: number }[];
}) {
  const data = {
    labels: groups.map((g) => pillarMap[g.pillar] ?? g.pillar),
    datasets: [
      {
        label: 'Average Score',
        data: groups.map((g) => Number(g.avg.toFixed(2))),
        backgroundColor: 'rgba(0, 198, 160, 0.22)',
        borderColor: '#29568f',
        borderWidth: 2,
        pointBackgroundColor: '#00c6a0',
      },
    ],
  };

  return (
    <div className="w-full h-64 md:h-80">
      <Radar
        data={data}
        options={{
          scales: {
            r: {
              suggestedMin: 0,
              suggestedMax: 5,
              ticks: { stepSize: 1 },
            },
          },
          plugins: { legend: { display: false } },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
