import React, { useState } from 'react';
import { Users, UserCheck } from 'lucide-react';

export interface StatsData {
  total: number;
  byGender: { male: number; female: number };
  byLevel: { name: string; male: number; female: number; rooms: number }[];
}

export interface PeopleDashboardProps {
  studentData: StatsData;
  staffData: StatsData;
}

export const PeopleDashboard: React.FC<PeopleDashboardProps> = ({ studentData, staffData }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const currentData = activeTab === 'student' ? studentData : staffData;

  const malePercent = Math.round((currentData.byGender.male / currentData.total) * 100) || 0;
  const femalePercent = 100 - malePercent;

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      
      {/* แท็บบาร์สลับระหว่าง นักเรียน และ บุคลากร */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab('student')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'student'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          ข้อมูลนักเรียน
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'staff'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          ข้อมูลบุคลากร
        </button>
      </div>

      {/* Grid Dashboard สรุปข้อมูล ด้านบน */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. จำนวนทั้งหมด */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-extrabold text-sky-600 mb-2">
            {currentData.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 text-sky-500 mb-2">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-600">
            จำนวน{activeTab === 'student' ? 'นักเรียน' : 'บุคลากร'}ทั้งหมด
          </span>
        </div>

        {/* 2. กราฟแท่งแยกตามระดับชั้น / ตำแหน่ง */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-500 mb-4">
            {activeTab === 'student' ? 'จำนวนแยกตามระดับชั้น' : 'จำนวนแยกตามกลุ่มตำแหน่ง'}
          </h3>
          <div className="h-40 flex items-end justify-between gap-2 pt-4">
            {currentData.byLevel.slice(0, 6).map((item, index) => {
              const itemTotal = item.male + item.female;
              const maxVal = Math.max(...currentData.byLevel.map(l => l.male + l.female)) || 1;
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

        {/* 3. เพศ (กราฟวงกลม / Donut) */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-gray-500 mb-2 w-full text-left">สัดส่วนเพศ</h3>
          
          <div className="flex items-center justify-around w-full">
            {/* SVG Donut Chart */}
            <div className="relative w-28 h-28">
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
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600">
                เพศ
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-sky-500 rounded-sm"></span>
                <span className="text-gray-600">ชาย:</span>
                <span className="font-bold text-gray-800">{currentData.byGender.male} คน</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-lime-400 rounded-sm"></span>
                <span className="text-gray-600">หญิง:</span>
                <span className="font-bold text-gray-800">{currentData.byGender.female} คน</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ตารางแสดงรายละเอียดข้อมูลด้านล่าง */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-sm font-bold text-gray-700">
          ตารางรายละเอียด{activeTab === 'student' ? 'จำนวนนักเรียนตามระดับชั้น' : 'จำนวนบุคลากรตามตำแหน่ง'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">
                  {activeTab === 'student' ? 'ระดับชั้น' : 'ตำแหน่ง / ประเภทงาน'}
                </th>
                <th className="px-6 py-3 text-center">จำนวนห้อง</th>
                <th className="px-6 py-3 text-center">ชาย</th>
                <th className="px-6 py-3 text-center">หญิง</th>
                <th className="px-6 py-3 text-center">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.byLevel.map((row, idx) => {
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