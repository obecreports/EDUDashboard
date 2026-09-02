import React from 'react';
import { Users } from 'lucide-react';

export interface StudentStatsData {
  total: number;
  byGender: { male: number; female: number };
  byLevel: { name: string; male: number; female: number; rooms: number }[];
}

export interface StudentDashboardProps {
  data: StudentStatsData;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ data }) => {
  const malePercent = Math.round((data.byGender.male / data.total) * 100) || 0;
  const femalePercent = 100 - malePercent;

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. จำนวนนักเรียนทั้งหมด */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-extrabold text-sky-600 mb-2">
            {data.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 text-sky-500 mb-2">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-600">
            จำนวนนักเรียนทั้งหมด
          </span>
        </div>

        {/* 2. กราฟแท่งแยกตามระดับชั้น */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-500 mb-4">
            จำนวนแยกตามระดับชั้น
          </h3>
          <div className="h-40 flex items-end justify-between gap-2 pt-4">
            {data.byLevel.slice(0, 6).map((item, index) => {
              const itemTotal = item.male + item.female;
              const maxVal = Math.max(...data.byLevel.map(l => l.male + l.female)) || 1;
              const heightPercent = Math.max((itemTotal / maxVal) * 100, 8);

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full max-w-[28px] bg-sky-100 rounded-t flex flex-col overflow-hidden" style={{ height: `${heightPercent}%` }}>
                    <div className="bg-lime-400 w-full" style={{ height: `${(item.female / (itemTotal || 1)) * 100}%` }}></div>
                    <div className="bg-sky-500 w-full" style={{ height: `${(item.male / (itemTotal || 1)) * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] text-gray-500 truncate w-full text-center" title={item.name}>
                    {item.name.replace('ประถมศึกษาปีที่ ', 'ป.').replace('มัธยมศึกษาปีที่ ', 'ม.')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 text-xs text-gray-500 mt-4">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-sky-500 rounded-full"></span> ชาย</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-lime-400 rounded-full"></span> หญิง</span>
          </div>
        </div>

        {/* 3. เพศ (ไม่มี Label ตาม request) */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-gray-500 mb-2 w-full text-left">เพศ</h3>
          <div className="flex items-center justify-center w-full mt-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-lime-400 stroke-current"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${femalePercent}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-sky-500 stroke-current"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${malePercent}, 100`}
                  strokeDashoffset={`-${femalePercent}`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* ตารางแสดงรายละเอียดข้อมูลนักเรียน */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-sm font-bold text-gray-700">
          ตารางรายละเอียดจำนวนนักเรียนตามระดับชั้น
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">ระดับชั้น</th>
                <th className="px-6 py-3 text-center">จำนวนห้อง</th>
                <th className="px-6 py-3 text-center">ชาย</th>
                <th className="px-6 py-3 text-center">หญิง</th>
                <th className="px-6 py-3 text-center">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.byLevel.map((row, idx) => {
                const totalRow = row.male + row.female;
                return (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-3 text-center">{row.rooms}</td>
                    <td className="px-6 py-3 text-center">{row.male}</td>
                    <td className="px-6 py-3 text-center">{row.female}</td>
                    <td className="px-6 py-3 text-center font-bold text-sky-700">{totalRow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
