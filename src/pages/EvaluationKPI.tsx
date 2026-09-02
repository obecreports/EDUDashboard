import React from 'react';
import type { SchoolFull } from '../types/school';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const pillarMap: Record<string, string> = {
  S: 'ด้านผู้เรียน',
  M: 'ด้านการมีส่วนร่วม',
  H: 'ด้านผู้สอนและผู้บริหารสถานศึกษา',
  C: 'ด้านหลักสูตรและการสอน',
  D: 'ด้านโครงสร้างพื้นฐาน',
};

const getBarColorClass = (score: number) => {
  if (score >= 4.0) return 'bg-emerald-500';
  if (score >= 3.0) return 'bg-lime-500';
  if (score >= 2.0) return 'bg-amber-400';
  return 'bg-orange-400';
};

const buildPillarGroups = (school: SchoolFull) => {
  const scores: Record<string, number> = school.School_Score ?? {};
  const labelMap: Record<string, string> = (school as any).labelLookup ?? {};
  const pillars = ['S', 'M', 'H', 'C', 'D'];
  const groups: { pillar: string; rows: { label: string; score: number }[]; avg: number }[] = [];

  pillars.forEach((p) => {
    const rows: { label: string; score: number }[] = [];
    let sum = 0;
    let count = 0;
    Object.entries(scores).forEach(([code, value]) => {
      if (code.startsWith(p) && code.endsWith('_score')) {
        const label = labelMap[code] ?? code.replace('_score', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const score = typeof value === 'number' ? value : 0;
        rows.push({ label, score });
        sum += score;
        count++;
      }
    });
    const avg = count > 0 ? sum / count : (school.pillarScores as any)?.[
      p === 'S' ? 'learner' : p === 'M' ? 'participation' : p === 'H' ? 'teacherAdmin' : p === 'C' ? 'curriculum' : 'infrastructure'
    ] ?? 0;
    groups.push({ pillar: p, rows, avg });
  });

  return groups;
};

export const RadarChart: React.FC<{ groups: { pillar: string; rows: { label: string; score: number }[]; avg: number }[] }> = ({ groups }) => {
  const data = {
    labels: groups.map((g) => pillarMap[g.pillar] ?? `Pillar ${g.pillar}`),
    datasets: [
      {
        label: 'Average Score',
        data: groups.map((g) => Number(g.avg.toFixed(2))),
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
      },
    ],
  };

  const options = {
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 5,
        ticks: { stepSize: 1 },
        pointLabels: { font: { size: 12 } },
      },
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
  };

  return (
    <div className="w-full h-64 md:h-80">
      <Radar data={data} options={options} />
    </div>
  );
};

export const DualRadarChart: React.FC<{
  groups: { pillar: string; rows: { label: string; score: number }[]; avg: number }[];
}> = ({ groups }) => {
  const nationalAvgs = [3.85, 3.70, 3.90, 3.65, 3.60];

  const data = {
    labels: groups.map((g) => pillarMap[g.pillar] ?? `Pillar ${g.pillar}`),
    datasets: [
      {
        label: 'โรงเรียนนี้ (Current School)',
        data: groups.map((g) => Number(g.avg.toFixed(2))),
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2.5,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
      },
      {
        label: 'ค่าเฉลี่ยทุกโรงเรียน (All School Avg)',
        data: nationalAvgs,
        backgroundColor: 'rgba(30, 58, 138, 0.2)',
        borderColor: 'rgba(30, 58, 138, 1)',
        borderWidth: 2,
        borderDash: [4, 4],
        pointBackgroundColor: 'rgba(30, 58, 138, 1)',
      },
    ],
  };

  const options = {
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 5,
        ticks: { stepSize: 1 },
        pointLabels: { font: { size: 12, weight: 'bold' as const } },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 12 } },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="w-full h-72 md:h-80 mb-6">
      <Radar data={data} options={options} />
    </div>
  );
};

export const EvaluationKPI: React.FC<{ school: SchoolFull }> = ({ school }) => {
  const pillarGroups = buildPillarGroups(school);
  const overallScore = (school as any).overallScore ?? 0;

  const leftPillarCodes = ['H', 'M'];
  const rightPillarCodes = ['S', 'C', 'D'];

  const leftGroups = leftPillarCodes.map((code) => pillarGroups.find((g) => g.pillar === code)).filter(Boolean);
  const rightGroups = rightPillarCodes.map((code) => pillarGroups.find((g) => g.pillar === code)).filter(Boolean);

  const renderCard = (group: any, idx: number) => (
    <div key={idx} className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-start">
      {/* Card Header */}
      <div className="bg-sky-700 text-white px-4 py-2.5 flex justify-between items-center w-full">
        <span className="font-bold text-sm">{pillarMap[group.pillar] ?? `Pillar ${group.pillar}`}</span>
        <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-sky-100">
          เฉลี่ย: {group.avg.toFixed(2)}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-start content-start">
        {group.rows.length > 0 ? (
          group.rows.map((row: any, i: number) => {
            const percentage = Math.min((row.score / 5) * 100, 100);
            const barColor = getBarColorClass(row.score);
            return (
              <div key={i} className="bg-slate-50 p-2.5 rounded border border-gray-100 space-y-1.5 flex flex-col justify-start">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-gray-700 font-semibold line-clamp-1">{row.label}</span>
                  <span className="font-bold text-sky-900 shrink-0 text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">{row.score.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 text-center text-gray-400 py-3 italic">
            ไม่มีตัวชี้วัดย่อย
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      {/* Spider Chart Section */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs">
        <h3 className="text-base font-bold text-sky-900 mb-4 text-center">
          เปรียบเทียบผลการประเมินกับค่าเฉลี่ยทุกโรงเรียน
        </h3>
        <DualRadarChart groups={pillarGroups} />
        
        <div className="bg-sky-50 p-4 rounded-md border border-sky-100 flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-sky-900">สรุปคะแนนเฉลี่ยรวมทุกด้าน</span>
          <span className="text-2xl font-black text-emerald-600">{overallScore.toFixed(2)}</span>
        </div>
      </div>

      {/* Balanced 2 Column Layout (Left: H, M | Right: S, C, D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Side Column */}
        <div className="space-y-6 flex flex-col">
          {leftGroups.map((g, idx) => renderCard(g, idx))}
        </div>

        {/* Right Side Column */}
        <div className="space-y-6 flex flex-col">
          {rightGroups.map((g, idx) => renderCard(g, idx))}
        </div>
      </div>
    </div>
  );
};