import React from 'react';
import { UserCheck } from 'lucide-react';

export interface StaffStatsData {
  total: number;
  byGender: { male: number; female: number };
}

export interface StaffDashboardProps {
  data: StaffStatsData;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ data }) => {
  const malePercent = Math.round((data.byGender.male / data.total) * 100) || 0;
  const femalePercent = 100 - malePercent;

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. จำนวนบุคลากรทั้งหมด */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-extrabold text-sky-600 mb-2">
            {data.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 text-sky-500 mb-2">
            <UserCheck className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-600">
            จำนวนบุคลากรทั้งหมด
          </span>
        </div>

        {/* 2. เพศ (ไม่มี Label) */}
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

        {/* 3. อายุ (ยังไม่มี detail - placeholder) */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-gray-500 mb-2 w-full text-left">อายุ</h3>
          <div className="flex flex-col items-center justify-center h-full w-full opacity-50">
            <div className="text-sm text-gray-400 mb-2">รอข้อมูลอายุ</div>
            <div className="w-full flex items-end justify-around h-24 mt-2">
              <div className="w-1/5 bg-gray-200 rounded-t h-1/4"></div>
              <div className="w-1/5 bg-gray-300 rounded-t h-2/4"></div>
              <div className="w-1/5 bg-gray-400 rounded-t h-3/4"></div>
              <div className="w-1/5 bg-gray-300 rounded-t h-2/4"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
