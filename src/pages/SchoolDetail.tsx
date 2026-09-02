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


  // Parse raw School_People table fields
  const people = school?.School_People ?? {};
  const labelLookup = school?.labelLookup ?? {};

  // Build Student Data Groups from School_People
  const getVal = (key: string) => (typeof people[key] === 'number' ? people[key] : 0);

  const getLabel = (code: string, fallback: string) => labelLookup[code] || fallback;

  const kinderLevels = [
    { code: 'kinder_1', name: getLabel('kinder_1', 'อนุบาล 1'), boy: getVal('kinder_1_boy'), girl: getVal('kinder_1_girl'), sum: getVal('kinder_1_sum') },
    { code: 'kinder_2', name: getLabel('kinder_2', 'อนุบาล 2'), boy: getVal('kinder_2_boy'), girl: getVal('kinder_2_girl'), sum: getVal('kinder_2_sum') },
    { code: 'kinder_3', name: getLabel('kinder_3', 'อนุบาล 3'), boy: getVal('kinder_3_boy'), girl: getVal('kinder_3_girl'), sum: getVal('kinder_3_sum') },
  ].filter(l => l.sum > 0 || l.boy > 0 || l.girl > 0);

  const primaryLevels = [
    { code: 'primary_1', name: getLabel('primary_1', 'ประถมศึกษาปีที่ 1'), boy: getVal('primary_1_boy'), girl: getVal('primary_1_girl'), sum: getVal('primary_1_sum') },
    { code: 'primary_2', name: getLabel('primary_2', 'ประถมศึกษาปีที่ 2'), boy: getVal('primary_2_boy'), girl: getVal('primary_2_girl'), sum: getVal('primary_2_sum') },
    { code: 'primary_3', name: getLabel('primary_3', 'ประถมศึกษาปีที่ 3'), boy: getVal('primary_3_boy'), girl: getVal('primary_3_girl'), sum: getVal('primary_3_sum') },
    { code: 'primary_4', name: getLabel('primary_4', 'ประถมศึกษาปีที่ 4'), boy: getVal('primary_4_boy'), girl: getVal('primary_4_girl'), sum: getVal('primary_4_sum') },
    { code: 'primary_5', name: getLabel('primary_5', 'ประถมศึกษาปีที่ 5'), boy: getVal('primary_5_boy'), girl: getVal('primary_5_girl'), sum: getVal('primary_5_sum') },
    { code: 'primary_6', name: getLabel('primary_6', 'ประถมศึกษาปีที่ 6'), boy: getVal('primary_6_boy'), girl: getVal('primary_6_girl'), sum: getVal('primary_6_sum') },
  ].filter(l => l.sum > 0 || l.boy > 0 || l.girl > 0);

  const middleLevels = [
    { code: 'middle_1', name: getLabel('middle_1', 'มัธยมศึกษาปีที่ 1'), boy: getVal('middle_1_boy'), girl: getVal('middle_1_girl'), sum: getVal('middle_1_sum') },
    { code: 'middle_2', name: getLabel('middle_2', 'มัธยมศึกษาปีที่ 2'), boy: getVal('middle_2_boy'), girl: getVal('middle_2_girl'), sum: getVal('middle_2_sum') },
    { code: 'middle_3', name: getLabel('middle_3', 'มัธยมศึกษาปีที่ 3'), boy: getVal('middle_3_boy'), girl: getVal('middle_3_girl'), sum: getVal('middle_3_sum') },
  ].filter(l => l.sum > 0 || l.boy > 0 || l.girl > 0);

  const highschoolLevels = [
    { code: 'highschool_4', name: getLabel('highschool_4', 'มัธยมศึกษาปีที่ 4'), boy: getVal('highschool_4_boy'), girl: getVal('highschool_4_girl'), sum: getVal('highschool_4_sum') },
    { code: 'highschool_5', name: getLabel('highschool_5', 'มัธยมศึกษาปีที่ 5'), boy: getVal('highschool_5_boy'), girl: getVal('highschool_5_girl'), sum: getVal('highschool_5_sum') },
    { code: 'highschool_6', name: getLabel('highschool_6', 'มัธยมศึกษาปีที่ 6'), boy: getVal('highschool_6_boy'), girl: getVal('highschool_6_girl'), sum: getVal('highschool_6_sum') },
  ].filter(l => l.sum > 0 || l.boy > 0 || l.girl > 0);

  const vocaLevels = [
    { code: 'Voca_1', name: getLabel('Voca_1', 'ปวช. 1'), boy: getVal('Voca_1_boy'), girl: getVal('Voca_1_girl'), sum: getVal('Voca_1_sum') },
    { code: 'Voca_2', name: getLabel('Voca_2', 'ปวช. 2'), boy: getVal('Voca_2_boy'), girl: getVal('Voca_2_girl'), sum: getVal('Voca_2_sum') },
    { code: 'Voca_3', name: getLabel('Voca_3', 'ปวช. 3'), boy: getVal('Voca_3_boy'), girl: getVal('Voca_3_girl'), sum: getVal('Voca_3_sum') },
  ].filter(l => l.sum > 0 || l.boy > 0 || l.girl > 0);

  const studentGroups = [
    { groupName: getLabel('kinder_all_sum', 'ระดับก่อนประถมศึกษา (Kindergarten)'), sum: getVal('kinder_all_sum'), levels: kinderLevels },
    { groupName: getLabel('primary_all_sum', 'ระดับประถมศึกษา (Primary)'), sum: getVal('primary_all_sum'), levels: primaryLevels },
    { groupName: getLabel('midhigh_all_sum', 'ระดับมัธยมศึกษา (Middle / High School)'), sum: getVal('midhigh_all_sum'), levels: [...middleLevels, ...highschoolLevels] },
    { groupName: getLabel('Voca_all_sum', 'ระดับอาชีวศึกษา (Vocational)'), sum: getVal('Voca_all_sum'), levels: vocaLevels },
  ].filter(g => g.levels.length > 0 || g.sum > 0);

  // Total Students Male/Female Gender breakdown
  const totalBoys = [...kinderLevels, ...primaryLevels, ...middleLevels, ...highschoolLevels, ...vocaLevels].reduce((sum, l) => sum + l.boy, 0);
  const totalGirls = [...kinderLevels, ...primaryLevels, ...middleLevels, ...highschoolLevels, ...vocaLevels].reduce((sum, l) => sum + l.girl, 0);
  const totalStudents = getVal('sum_student') || (totalBoys + totalGirls);

  const studentData = {
    total: totalStudents,
    byGender: {
      male: totalBoys,
      female: totalGirls,
    },
    groups: studentGroups,
    labelLookup,
  };

  // Staff Data
  const teacherDirector = getVal('teacher_director');
  const actualTeacher = getVal('actual_teacher');
  const totalStaff = teacherDirector + actualTeacher;

  const staffData = {
    total: totalStaff,
    teacherDirector,
    actualTeacher,
    labelLookup,
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