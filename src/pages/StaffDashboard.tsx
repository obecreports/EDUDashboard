import React from 'react';
import { UserCheck } from 'lucide-react';

export interface StaffStatsData {
  total: number;
  teacherDirector: number;
  actualTeacher: number;
  labelLookup?: Record<string, string>;
}

export interface StaffDashboardProps {
  data: StaffStatsData;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ data }) => {
  const directorLabel = data.labelLookup?.['teacher_director'] || 'ผู้บริหารสถานศึกษา';
  const teacherLabel = data.labelLookup?.['actual_teacher'] || 'ครูผู้สอน / ครูปฏิบัติการ';

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. จำนวนบุคลากรรวม */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-black text-sky-600 mb-2">
            {data.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5 text-sky-600 mb-1">
            <UserCheck className="w-5 h-5" />
            <span className="text-sm font-bold text-gray-700">จำนวนบุคลากรทั้งหมด</span>
          </div>
        </div>

        {/* 2. ตำแหน่งบริหาร */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-500">ตำแหน่งบริหาร</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-sky-800">{data.teacherDirector.toLocaleString()}</span>
            <span className="text-xs text-gray-500 ml-1">คน</span>
          </div>
          <span className="text-xs text-gray-600 font-semibold">{directorLabel}</span>
        </div>

        {/* 3. ตำแหน่งผู้สอน */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-500">ตำแหน่งผู้สอน</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-emerald-600">{data.actualTeacher.toLocaleString()}</span>
            <span className="text-xs text-gray-500 ml-1">คน</span>
          </div>
          <span className="text-xs text-gray-600 font-semibold">{teacherLabel}</span>
        </div>
      </div>

      {/* Staff Breakdown Table (Pure Thai Labels, No English Code/Columns) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
        <div className="bg-sky-800 text-white px-5 py-3 text-sm font-bold">
          รายละเอียดจำนวนบุคลากร
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-gray-700">
            <thead className="text-[11px] text-gray-700 uppercase bg-slate-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-bold">ตำแหน่งบุคลากร</th>
                <th className="px-6 py-3 text-center font-bold">จำนวน (คน)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-sky-50/50 transition">
                <td className="px-6 py-3 font-semibold text-gray-800">{directorLabel}</td>
                <td className="px-6 py-3 text-center font-bold text-sky-800">{data.teacherDirector.toLocaleString()}</td>
              </tr>
              <tr className="hover:bg-sky-50/50 transition">
                <td className="px-6 py-3 font-semibold text-gray-800">{teacherLabel}</td>
                <td className="px-6 py-3 text-center font-bold text-emerald-700">{data.actualTeacher.toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-50 font-bold border-t border-gray-200">
                <td className="px-6 py-3 text-gray-900">รวมบุคลากรทั้งสิ้น</td>
                <td className="px-6 py-3 text-center text-sky-900 text-sm font-extrabold">{data.total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
