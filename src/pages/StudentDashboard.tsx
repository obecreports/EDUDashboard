import React from 'react';
import { Users } from 'lucide-react';

export interface LevelDetail {
  code: string;
  name: string;
  boy: number;
  girl: number;
  sum: number;
}

export interface GroupSummary {
  groupName: string;
  sum: number;
  levels: LevelDetail[];
}

export interface StudentStatsData {
  total: number;
  byGender: { male: number; female: number };
  groups: GroupSummary[];
  labelLookup?: Record<string, string>;
}

export interface StudentDashboardProps {
  data: StudentStatsData;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ data }) => {
  const totalStudents = data.total || 0;
  const malePercent = totalStudents > 0 ? Math.round((data.byGender.male / totalStudents) * 100) : 0;
  const femalePercent = totalStudents > 0 ? 100 - malePercent : 0;

  // Flatten all grade levels for vertical bar chart
  const allLevels = data.groups.flatMap((g) => g.levels);
  const maxVal = Math.max(...allLevels.map((l) => l.sum), 1);

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      {/* Upper Section: Cards & Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* 1. จำนวนนักเรียนทั้งหมด */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-black text-sky-600 mb-2">
            {totalStudents.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5 text-sky-600 mb-1">
            <Users className="w-5 h-5" />
            <span className="text-sm font-bold text-gray-700">จำนวนนักเรียนรวม</span>
          </div>
        </div>

        {/* 2. แบ่งตามระดับชั้น (Vertical Stacked Bar Chart by Gender) */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-700 mb-2">แบ่งตามระดับชั้น</h3>
          
          {allLevels.length > 0 ? (
            <div className="h-36 flex items-end justify-between gap-1.5 pt-4 border-b border-gray-100 pb-1 overflow-x-auto">
              {allLevels.map((item, idx) => {
                const heightPercent = Math.max((item.sum / maxVal) * 100, 10);
                const boyPercent = (item.boy / (item.sum || 1)) * 100;
                const girlPercent = (item.girl / (item.sum || 1)) * 100;

                // Shorten class name for bar chart label
                const shortName = item.name
                  .replace('อนุบาล ', 'อ.')
                  .replace('ประถมศึกษาปีที่ ', 'ป.')
                  .replace('มัธยมศึกษาปีที่ ', 'ม.')
                  .replace('ปวช. ', 'ปวช.');

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-[20px]">
                    <div
                      className="w-full max-w-[24px] bg-slate-100 rounded-t flex flex-col overflow-hidden"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.name}: รวม ${item.sum} คน (ชาย ${item.boy}, หญิง ${item.girl})`}
                    >
                      {/* Female (Pink) stacked on top of Male (Sky Blue) */}
                      <div className="bg-pink-400 w-full" style={{ height: `${girlPercent}%` }}></div>
                      <div className="bg-sky-500 w-full" style={{ height: `${boyPercent}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium truncate w-full text-center">
                      {shortName}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-gray-400">
              ไม่มีข้อมูลระดับชั้น
            </div>
          )}

          <div className="flex justify-center gap-4 text-[11px] text-gray-600 mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-sky-500 rounded-full inline-block"></span> ชาย
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-pink-400 rounded-full inline-block"></span> หญิง
            </span>
          </div>
        </div>

        {/* 3. เพศ (Donut Chart) */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-gray-700 mb-2 w-full text-left">เพศ</h3>
          <div className="flex items-center justify-center gap-6 w-full my-auto">
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <path
                  className="text-slate-100 stroke-current"
                  strokeWidth="4.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Female Arc (Pink) */}
                <path
                  className="text-pink-400 stroke-current"
                  strokeWidth="4.5"
                  fill="none"
                  strokeDasharray={`${femalePercent}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Male Arc (Sky Blue) */}
                <path
                  className="text-sky-500 stroke-current"
                  strokeWidth="4.5"
                  fill="none"
                  strokeDasharray={`${malePercent}, 100`}
                  strokeDashoffset={`-${femalePercent}`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-extrabold text-gray-800">{totalStudents.toLocaleString()}</span>
                <span className="text-[9px] text-gray-400">คน</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-sky-500 rounded-full inline-block"></span>
                <span className="text-gray-700">ชาย: <strong className="text-sky-800">{data.byGender.male.toLocaleString()}</strong> ({malePercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-pink-400 rounded-full inline-block"></span>
                <span className="text-gray-700">หญิง: <strong className="text-pink-700">{data.byGender.female.toLocaleString()}</strong> ({femalePercent}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Detailed Tables per Educational Group (Pure Thai Labels, No English Code/Words) */}
      <div className="space-y-6">
        {data.groups.map((group, gIdx) => (
          <div key={gIdx} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
            <div className="bg-sky-800 text-white px-5 py-3 flex justify-between items-center text-sm font-bold">
              <span>{group.groupName}</span>
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded text-sky-100 font-semibold">
                รวม {group.sum.toLocaleString()} คน
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-[11px] text-gray-700 uppercase bg-slate-100 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-2.5 font-bold">ระดับชั้น</th>
                    <th className="px-5 py-2.5 text-center font-bold">นักเรียนชาย (คน)</th>
                    <th className="px-5 py-2.5 text-center font-bold">นักเรียนหญิง (คน)</th>
                    <th className="px-5 py-2.5 text-center font-bold">รวม (คน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.levels.map((lvl, lIdx) => (
                    <tr key={lIdx} className="hover:bg-sky-50/50 transition">
                      <td className="px-5 py-2.5 font-semibold text-gray-900">{lvl.name}</td>
                      <td className="px-5 py-2.5 text-center text-sky-700 font-medium">{lvl.boy.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-center text-pink-600 font-medium">{lvl.girl.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-center font-bold text-gray-900">{lvl.sum.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
