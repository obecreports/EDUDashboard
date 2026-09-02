import React from 'react';
import { User } from 'lucide-react';

export interface DimensionScore {
  id: number;
  name: string;
  score: number;
  avgScore: number;
}

export interface OverviewTabProps {
  dimensionsData: DimensionScore[];
  currentYearScore: number;
  nationalAvgScore?: number;
  directorName: string;
  directorTitle: string;
}

const getScoreLabel = (score: number) => {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4.0) return 'Great';
  if (score >= 3.0) return 'Good';
  if (score >= 2.0) return 'Fair';
  return 'Developing';
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  dimensionsData,
  currentYearScore,
  nationalAvgScore = 3.75,
  directorName,
  directorTitle,
}) => {
  const center = 150;
  const radius = 105;
  const numSides = 5;

  const pillarMap: Record<string, string> = {
    S: 'ด้านผู้เรียน',
    M: 'ด้านการมีส่วนร่วม',
    H: 'ด้านผู้สอนและผู้บริหาร',
    C: 'ด้านหลักสูตรและการสอน',
    D: 'ด้านโครงสร้างพื้นฐาน',
  };

  const pillarCodes = ['S', 'M', 'H', 'C', 'D'];
  const fullPillars = pillarCodes.map((code) => {
    const match = dimensionsData.find(
      (d) => d.name.includes(pillarMap[code]) || d.name.endsWith(code)
    );
    return match
      ? { ...match, label: pillarMap[code] }
      : { id: 0, name: pillarMap[code], score: 0, avgScore: 3.7, label: pillarMap[code] };
  });

  function getCoordinates(index: number, val: number) {
    const angle = ((Math.PI * 2) / numSides) * index - Math.PI / 2;
    const r = (val / 5) * radius; // max score is 5
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  }

  // Polygon points for school score (Green) and all-school average (Yellow dashed background)
  const currentPoints = fullPillars
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.score);
      return `${x},${y}`;
    })
    .join(' ');

  const avgPoints = fullPillars
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.avgScore || 3.7);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: School Grading, Director Card & Comparison */}
        <div className="bg-transparent p-2 space-y-5">
          {/* Director Info */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold">{directorTitle || 'ผู้อำนวยการโรงเรียน'}</div>
              <div className="font-bold text-gray-800 text-base">{directorName || 'ไม่ระบุชื่อผู้อำนวยการ'}</div>
            </div>
          </div>

          {/* School Grading Header */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h2 className="text-xl font-extrabold text-sky-900">School Grading (การจัดระดับคุณภาพ)</h2>
          </div>

          {/* Score comparison view (Current School vs All School Average) */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-gray-200 text-center">
            <div className="border-r border-gray-200 pr-2">
              <span className="text-xs text-gray-500 block font-semibold mb-1">โรงเรียนนี้</span>
              <span className="text-4xl font-black text-emerald-600">{currentYearScore.toFixed(2)}</span>
              <span className="text-xs text-emerald-700 font-medium block mt-1">
                {getScoreLabel(currentYearScore)}
              </span>
            </div>
            <div className="pl-2">
              <span className="text-xs text-gray-500 block font-semibold mb-1">ค่าเฉลี่ยทุกโรงเรียน</span>
              <span className="text-4xl font-black text-amber-500">{nationalAvgScore.toFixed(2)}</span>
              <span className="text-xs text-amber-700 font-medium block mt-1">
                {getScoreLabel(nationalAvgScore)}
              </span>
            </div>
          </div>

          {/* Score Level Bar */}
          <div className="relative pt-6 pb-2">
            <div className="h-3 w-full bg-gray-200 rounded-full flex overflow-hidden">
              <div className="w-1/5 bg-orange-400"></div>
              <div className="w-1/5 bg-amber-400"></div>
              <div className="w-1/5 bg-lime-400"></div>
              <div className="w-1/5 bg-emerald-400"></div>
              <div className="w-1/5 bg-emerald-600"></div>
            </div>

            {/* Indicator Marker for Current School */}
            <div
              className="absolute top-0 transition-all transform -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${(currentYearScore / 5) * 100}%` }}
            >
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
                โรงเรียนนี้ ({currentYearScore.toFixed(2)})
              </span>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-emerald-700"></div>
            </div>

            {/* Indicator Marker for All Schools Average */}
            <div
              className="absolute top-0 transition-all transform -translate-x-1/2 flex flex-col items-center opacity-80"
              style={{ left: `${(nationalAvgScore / 5) * 100}%` }}
            >
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-amber-600 mt-7"></div>
            </div>

            {/* Scale 0-5 */}
            <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Quality Levels Table */}
          <div className="border border-gray-200 rounded overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 border-b border-gray-200">
              เกณฑ์ระดับคุณภาพ (Quality Categories)
            </div>
            <div className="grid grid-cols-5 text-center text-[11px]">
              <div className="p-2 bg-orange-500 text-white font-medium">Developing<br />0.00–1.99</div>
              <div className="p-2 bg-amber-400 text-white font-medium">Fair<br />2.00–2.99</div>
              <div className="p-2 bg-lime-500 text-white font-medium">Good<br />3.00–3.99</div>
              <div className="p-2 bg-emerald-500 text-white font-medium">Great<br />4.00–4.99</div>
              <div className="p-2 bg-emerald-700 text-white font-medium">Excellent<br />5.00</div>
            </div>
          </div>
        </div>

        {/* Right Side: Spider/Radar Chart */}
        <div className="bg-slate-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
          <div className="flex items-center gap-6 text-xs mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-700 inline-block"></span>
              <span className="font-semibold text-gray-700">โรงเรียนนี้</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-amber-300 border border-amber-500 border-dashed inline-block"></span>
              <span className="font-semibold text-gray-700">ค่าเฉลี่ยทุกโรงเรียน</span>
            </div>
          </div>

          {/* SVG Spider Chart */}
          <div className="relative w-[340px] h-[340px]">
            <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
              {/* Web Grid Circles */}
              {[1, 2, 3, 4, 5].map((lvl) => (
                <polygon
                  key={lvl}
                  points={fullPillars
                    .map((_, i) => {
                      const { x, y } = getCoordinates(i, lvl);
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Axis lines */}
              {fullPillars.map((_, i) => {
                const { x, y } = getCoordinates(i, 5);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#94a3b8"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Average Polygon (Yellow Background with Dot Line) */}
              <polygon
                points={avgPoints}
                fill="rgba(251, 191, 36, 0.25)"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Current School Polygon (Green Line) */}
              <polygon
                points={currentPoints}
                fill="rgba(16, 185, 129, 0.3)"
                stroke="#10b981"
                strokeWidth="2.5"
              />

              {/* Points for Current School */}
              {fullPillars.map((d, i) => {
                const { x, y } = getCoordinates(i, d.score);
                return <circle key={i} cx={x} cy={y} r="4" className="fill-emerald-700 stroke-white stroke-2" />;
              })}
            </svg>

            {/* Pillar Labels */}
            {fullPillars.map((d, i) => {
              const angle = ((Math.PI * 2) / numSides) * i - Math.PI / 2;
              const labelRadius = radius + 36;
              const lx = center + labelRadius * Math.cos(angle);
              const ly = center + labelRadius * Math.sin(angle);

              return (
                <div
                  key={i}
                  className="absolute text-[11px] font-bold text-gray-800 bg-white px-2 py-1 rounded border border-gray-300 shadow-xs text-center transform -translate-x-1/2 -translate-y-1/2 max-w-[120px]"
                  style={{ left: `${(lx / 300) * 100}%`, top: `${(ly / 300) * 100}%` }}
                >
                  {d.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};