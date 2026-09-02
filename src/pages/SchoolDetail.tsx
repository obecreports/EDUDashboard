import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Home,
  Info,
  Users,
  UserCheck,
  Award,
  // MapPin,
  // Phone,
  // Zap,
  // Wifi,
  // Building2
} from 'lucide-react';
import { fetchSchoolById } from '../services/supabase';

import { OverviewTab } from './OverviewTab';
import { EvaluationKPI } from './EvaluationKPI';
import { StudentDashboard } from './StudentDashboard';
import { StaffDashboard } from './StaffDashboard';
import { BasicInfoTab } from './BasicInfoTab';

export const SchoolDetail: React.FC = () => {
  // สเตตควบคุมแท็บที่ใช้งานอยู่
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch school data from Supabase
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: replace with actual school ID source (e.g., route param)
        const data = await fetchSchoolById(id ?? '');
        setSchool(data);
      } catch (e) {
        console.error('Failed to fetch school data', e);
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  // Map fetched data to expected format for child components
  const schoolInfo = {
    name: school?.school_name_th ?? '',
    address: `${school?.moo ? `หมู่ ${school.moo}` : ''} ${school?.village_name ?? ''} ${school?.subdistrict ? `ต.${school.subdistrict}` : ''} ${school?.district ? `อ.${school.district}` : ''} ${school?.province ? `จ.${school.province}` : ''}`.trim(),
    area: school?.area_name || school?.Gov_Domain?.area_name || school?.organize_domain || '',
    phone: school?.phone ?? '',
    director: school?.director_name ?? '',
    director_title: school?.director_title || 'ผู้อำนวยการโรงเรียน',
    latitude: school?.lat ?? school?.latitude ?? '',
    longitude: school?.long ?? school?.longitude ?? '',
    school_size: school?.school_size ?? '',
    organize_domain: school?.organize_domain ?? '',
    partner: '',
    ictTalent: '',
    supervisor: '',
    hasElectricity: Boolean(school?.hasElectricity),
    hasInternet: Boolean(school?.hasInternet),
  };

  // 5 Pillars Data
  const dimensionsData = [
    { id: 1, name: '1. ด้านผู้เรียน', score: school?.pillarScores?.learner ?? 0, avgScore: 3.85 },
    { id: 2, name: '2. ด้านการมีส่วนร่วม', score: school?.pillarScores?.participation ?? 0, avgScore: 3.70 },
    { id: 3, name: '3. ด้านผู้สอนและผู้บริหาร', score: school?.pillarScores?.teacherAdmin ?? 0, avgScore: 3.90 },
    { id: 4, name: '4. ด้านหลักสูตรและการสอน', score: school?.pillarScores?.curriculum ?? 0, avgScore: 3.65 },
    { id: 5, name: '5. ด้านโครงสร้างพื้นฐาน', score: school?.pillarScores?.infrastructure ?? 0, avgScore: 3.60 },
  ];

  const currentYearScore = (school as any)?.overallScore ?? (
    dimensionsData.reduce((sum, d) => sum + d.score, 0) / dimensionsData.length
  );
  const nationalAvgScore = dimensionsData.reduce((sum, d) => sum + d.avgScore, 0) / dimensionsData.length;
  // const lastYearScore = 0; // Placeholder – can be fetched similarly if available

  // KPI data for EvaluationKPI component, derived from school pillar scores
  // const kpiData = [
  //   {
  //     category: 'ผลการประเมินรายด้าน',
  //     items: [
  //       { title: 'ผู้เรียน', score: school?.pillarScores?.learner ?? 0 },
  //       { title: 'การมีส่วนร่วม', score: school?.pillarScores?.participation ?? 0 },
  //       { title: 'ผู้สอนและผู้บริหาร', score: school?.pillarScores?.teacherAdmin ?? 0 },
  //       { title: 'โครงสร้างพื้นฐาน', score: school?.pillarScores?.infrastructure ?? 0 }
  //     ],
  //   },
  // ];


  // Mock data for PeopleDashboard
  const studentData = {
    total: school?.studentSummary?.totalStudents ?? 0,
    byGender: {
      male: school?.studentSummary?.totalMale ?? 0,
      female: school?.studentSummary?.totalFemale ?? 0,
    },
    byLevel: [], // To be populated with detailed level data when available
  };
  const staffData = {
    total: school?.personnelSummary?.totalPersonnel ?? 0,
    byGender: {
      male: school?.personnelSummary?.totalMale ?? 0,
      female: school?.personnelSummary?.totalFemale ?? 0,
    },
    byLevel: [], // detailed staff level data can be added when available
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 pb-12">

      {/* 1. Header Banner ด้านบนสุด */}
      <div className="bg-sky-700 text-white px-6 py-8 shadow-inner">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs text-sky-200 mb-2">Home &gt; {schoolInfo.name}</div>
          <h1 className="text-3xl font-bold">{schoolInfo.name}</h1>
          <p className="text-sm text-sky-100 mt-1">อำเภอกบินทร์บุรี จังหวัดปราจีนบุรี</p>
        </div>
      </div>

      {/* 2. เมนู Navigation Tabs แบบ Icon ด้านบน (ตามรูปตัวอย่างที่ 1) */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-center items-center gap-2 sm:gap-6 px-4 py-3 overflow-x-auto">

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-1 min-w-[80px] py-1 transition border-b-2 ${activeTab === 'overview'
              ? 'border-sky-600 text-sky-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-sky-600'
              }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'overview' ? 'bg-sky-50' : 'bg-gray-100'}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-xs">ภาพรวม</span>
          </button>

          <button
            onClick={() => setActiveTab('basic')}
            className={`flex flex-col items-center gap-1 min-w-[80px] py-1 transition border-b-2 ${activeTab === 'basic'
              ? 'border-sky-600 text-sky-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-sky-600'
              }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'basic' ? 'bg-sky-50' : 'bg-gray-100'}`}>
              <Info className="w-5 h-5" />
            </div>
            <span className="text-xs">ข้อมูลพื้นฐาน</span>
          </button>



          <button
            onClick={() => setActiveTab('students')}
            className={`flex flex-col items-center gap-1 min-w-[80px] py-1 transition border-b-2 ${activeTab === 'students'
              ? 'border-sky-600 text-sky-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-sky-600'
              }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'students' ? 'bg-sky-50' : 'bg-gray-100'}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs">นักเรียน</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex flex-col items-center gap-1 min-w-[80px] py-1 transition border-b-2 ${activeTab === 'staff'
              ? 'border-sky-600 text-sky-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-sky-600'
              }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'staff' ? 'bg-sky-50' : 'bg-gray-100'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs">บุคลากร</span>
          </button>

          <button
            onClick={() => setActiveTab('evaluation')}
            className={`flex flex-col items-center gap-1 min-w-[90px] py-1 transition border-b-2 ${activeTab === 'evaluation'
              ? 'border-sky-600 text-sky-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-sky-600'
              }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'evaluation' ? 'bg-sky-50' : 'bg-gray-100'}`}>
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs text-center leading-tight">ผลการประเมิน</span>
          </button>

        </div>
      </div>

      {/* 3. ส่วนแสดงเนื้อหาตามแท็บที่เลือก (Main Content Area) */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* แท็บ: ภาพรวม */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <OverviewTab
              dimensionsData={dimensionsData}
              currentYearScore={currentYearScore}
              nationalAvgScore={nationalAvgScore}
              directorName={schoolInfo.director}
              directorTitle={schoolInfo.director_title}
            />
          </div>
        )}

        {/* แท็บ: ข้อมูลนักเรียน */}
        {activeTab === 'students' && (
          <div className="bg-white rounded border border-gray-200 p-2">
            <StudentDashboard data={studentData} />
          </div>
        )}

        {/* แท็บ: ข้อมูลบุคลากร */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded border border-gray-200 p-2">
            <StaffDashboard data={staffData} />
          </div>
        )}

        {/* แท็บ: ผลการประเมินคุณภาพโรงเรียน (KPI) */}
        {activeTab === 'evaluation' && (
          <div className="bg-white rounded border border-gray-200">
            <EvaluationKPI school={school} />
          </div>
        )}

        {/* แท็บ: ข้อมูลพื้นฐาน */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded border border-gray-200">
            <BasicInfoTab schoolInfo={schoolInfo} />
          </div>
        )}

      </div>
    </div>
  );
};
export default SchoolDetail;