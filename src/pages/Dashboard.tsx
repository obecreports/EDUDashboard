// Import icons removed (unused)
import { fetchSchools } from '../services/supabase';
import { useEffect, useState } from 'react';
import type { SchoolFull } from '../types/school';
import { RadarChart } from './EvaluationKPI';
import { ThailandMap } from '../components/ThailandMap';

export default function Dashboard() {
  const [allSchools, setAllSchools] = useState<SchoolFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab] = useState<'summary' | 'schools'>('summary');

  // Compute colour class for pillar cards based on score level
  const getPillarBg = (score: number) => {
    const level = getQualityCategory(score);
    switch (level) {
      case 'Developing':
        return 'bg-orange-100 text-orange-800';
      case 'Fair':
        return 'bg-amber-100 text-amber-800';
      case 'Good':
        return 'bg-lime-100 text-lime-800';
      case 'Great':
        return 'bg-emerald-100 text-emerald-800';
      case 'Excellent':
        return 'bg-emerald-200 text-emerald-900';
      default:
        return '';
    }
  };

  // Aggregate totals
  const totalSchools = allSchools.length;
  const totalStudents = allSchools.reduce((sum, s) => sum + (s.studentSummary?.totalStudents ?? 0), 0);
  const totalPersonnel = allSchools.reduce((sum, s) => sum + (s.personnelSummary?.totalPersonnel ?? 0), 0);
  const avgRatio = totalPersonnel > 0 ? Math.ceil(totalStudents / totalPersonnel) : 0;

  // Province grouping (top 10)
  const provinceMap = new Map<string, number>();
  allSchools.forEach(s => {
    const prov = s.province || 'ไม่ระบุ';
    provinceMap.set(prov, (provinceMap.get(prov) ?? 0) + (s.studentSummary?.totalStudents ?? 0));
  });
  const provinceData = Array.from(provinceMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 10);
  const maxProvince = Math.max(...provinceData.map(p => p[1]), 1);

  // Quality level counts based on overall score
  const getScoreColor = (level: string) => {
    switch (level) {
      case 'Developing':
        return 'bg-orange-500 text-white';
      case 'Fair':
        return 'bg-amber-400 text-white';
      case 'Good':
        return 'bg-lime-500 text-white';
      case 'Great':
        return 'bg-emerald-500 text-white';
      case 'Excellent':
        return 'bg-emerald-700 text-white';
      default:
        return '';
    }
  };

  const computeOverallScore = (s: any): number | undefined => {
    if (s.overallScore !== undefined) return s.overallScore;
    const ps = s.pillarScores;
    if (ps) {
      const sum = (ps.learner ?? 0) + (ps.participation ?? 0) + (ps.teacherAdmin ?? 0) + (ps.curriculum ?? 0) + (ps.infrastructure ?? 0);
      return sum / 5;
    }
    return undefined;
  };

  const getQualityCategory = (score: number | undefined): string => {
    if (score === undefined) return 'Unknown';
    if (score < 2) return 'Developing';
    if (score < 3) return 'Fair';
    if (score < 4) return 'Good';
    if (score < 5) return 'Great';
    return 'Excellent';
  };

  const qualityCategories = ['Developing', 'Fair', 'Good', 'Great', 'Excellent'];
  const qualityCounts = qualityCategories.map(level => ({
    level,
    count: allSchools.filter(s => getQualityCategory(computeOverallScore(s)) === level).length,
  })).sort((a, b) => b.count - a.count);

  const avgPillarScores = {
    S: allSchools.reduce((sum, s) => sum + (s.pillarScores?.learner ?? 0), 0) / (allSchools.length || 1),
    M: allSchools.reduce((sum, s) => sum + (s.pillarScores?.participation ?? 0), 0) / (allSchools.length || 1),
    H: allSchools.reduce((sum, s) => sum + (s.pillarScores?.teacherAdmin ?? 0), 0) / (allSchools.length || 1),
    C: allSchools.reduce((sum, s) => sum + (s.pillarScores?.curriculum ?? 0), 0) / (allSchools.length || 1),
    D: allSchools.reduce((sum, s) => sum + (s.pillarScores?.infrastructure ?? 0), 0) / (allSchools.length || 1),
  };
  const overallAvgScore = (avgPillarScores.S + avgPillarScores.M + avgPillarScores.H + avgPillarScores.C + avgPillarScores.D) / 5;

  const overallPillarGroups = [
    { pillar: 'S', rows: [], avg: avgPillarScores.S },
    { pillar: 'M', rows: [], avg: avgPillarScores.M },
    { pillar: 'H', rows: [], avg: avgPillarScores.H },
    { pillar: 'C', rows: [], avg: avgPillarScores.C },
    { pillar: 'D', rows: [], avg: avgPillarScores.D },
  ];

const pillarLabels: Record<string, string> = {
  S: 'ผู้เรียน',
  M: 'การมีส่วนร่วม',
  H: 'ผู้สอน/ผู้บริหาร',
  C: 'หลักสูตร',
  D: 'โครงสร้างพื้นฐาน',
};

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSchools();
        setAllSchools(data);
      } catch (e: any) {
        console.error('Failed to load schools from Supabase:', e);
        setErrorMsg(e?.message || 'Failed to fetch data from Supabase');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="loading-msg">กำลังดึงข้อมูลจาก Supabase …</p>;

  if (errorMsg) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6" style={{ color: '#dc2626', background: '#fee2e2', borderRadius: '8px', marginBottom: '1rem' }}>
        เกิดข้อผิดพลาดในการโหลดข้อมูล: {errorMsg}
      </div>
    );
  }

  const sizeDistribution = {
    เล็ก: allSchools.filter(s => s.school_size === 'เล็ก').length,
    กลาง: allSchools.filter(s => s.school_size === 'กลาง').length,
    ใหญ่: allSchools.filter(s => s.school_size === 'ใหญ่').length,
    ใหญ่พิเศษ: allSchools.filter(s => s.school_size === 'ใหญ่พิเศษ').length,
  };

  const districtMap = new Map<string, number>();
  allSchools.forEach(s => {
    const d = s.district || 'ไม่ระบุ';
    districtMap.set(d, (districtMap.get(d) ?? 0) + (s.studentSummary?.totalStudents ?? 0));
  });
  const districtData = Array.from(districtMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxStudents = Math.max(...districtData.map(d => d[1]), 1);
  const donutColors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];
  const sizeEntries = Object.entries(sizeDistribution);
  const totalSize = sizeEntries.reduce((s, [, v]) => s + v, 0);
  let cumulative = 0;
  const donutSegments = sizeEntries.map(([label, value], i) => {
    const percent = totalSize > 0 ? (value / totalSize) * 100 : 0;
    const start = cumulative;
    cumulative += percent;
    return { label, value, percent, start, color: donutColors[i % donutColors.length] };
  });
  const donutGradient = donutSegments
    .map(seg => `${seg.color} ${seg.start}% ${seg.start + seg.percent}%`)
    .join(', ');

  const barGradients = [
    'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
    'linear-gradient(90deg, #059669 0%, #34d399 100%)',
    'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)',
    'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)',
    'linear-gradient(90deg, #0891b2 0%, #22d3ee 100%)',
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 pb-12">
      {/* Tab Bar removed per user request */}


      {activeTab === 'summary' && (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
          {/* Sector 1 – ภาพรวมทุกด้าน */}
          <section>
            <h2 className="text-2xl font-semibold text-sky-800 mb-4">ภาพรวมทุกด้าน</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6 bg-white p-6 border border-gray-200 rounded-lg shadow-xs">
              <div className="md:col-span-2 flex justify-center">
                <RadarChart groups={overallPillarGroups} />
              </div>
              <div className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg bg-slate-50 text-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  คะแนนรวมเฉลี่ยทุกโรงเรียน
                </span>
                <div className={`text-5xl font-black px-6 py-3 rounded-lg shadow-xs ${getPillarBg(overallAvgScore)}`}>
                  {overallAvgScore.toFixed(2)}
                </div>
                <span className="text-xs text-gray-500 mt-2 font-medium">
                  ระดับคุณภาพ: <strong className="text-sky-900">{getQualityCategory(overallAvgScore)}</strong>
                </span>
              </div>
            </div>

            {/* 5 Pillar Cards arranged in a single row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {overallPillarGroups.map((group) => (
                <div
                  key={group.pillar}
                  className={`${getPillarBg(group.avg)} p-4 border border-gray-200 shadow-xs text-center rounded-md flex flex-col justify-center items-center`}
                >
                  <h3 className="text-xs font-bold text-gray-700 mb-1">{pillarLabels[group.pillar]}</h3>
                  <p className="text-2xl font-black">{group.avg.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Quality Table */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-sky-800 mb-4">ระดับคุณภาพ</h2>
            <div className="border border-gray-200">
                           <div className="grid grid-cols-5 text-center text-xs border-t border-gray-200">
                {qualityCounts
                  .sort((a, b) => {
                    const order = ['Excellent', 'Great', 'Good', 'Fair', 'Developing'];
                    return order.indexOf(b.level) - order.indexOf(a.level);
                  })
                  .map((item) => (
                    <div
                      key={item.level}
                      className={`p-2 ${getScoreColor(item.level)} flex flex-col items-center`}
                    >
                      <div className="text-2xl font-bold">{item.level}</div>
                      <div className="text-xl font-semibold">{item.count}</div>
                      <div className="text-xs text-gray-600">
                        {item.level === 'Developing' && '0.00–1.99'}
                        {item.level === 'Fair' && '2.00–2.99'}
                        {item.level === 'Good' && '3.00–3.99'}
                        {item.level === 'Great' && '4.00–4.99'}
                        {item.level === 'Excellent' && '5.00'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          {/* Sector 2 – ค่าสถิติต่างๆ */}
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-sky-800 mb-4">ค่าสถิติต่างๆ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* จำนวนบุคลากรรวม */}
              <div className="p-4 bg-white border border-gray-200 shadow-sm">
                <h3 className="font-bold mb-2">จำนวนบุคลากรรวม</h3>
                <p className="text-3xl font-extrabold">{totalPersonnel.toLocaleString()}</p>
              </div>
              {/* อัตราส่วนนักเรียน:ครู */}
              <div className="p-4 bg-white border border-gray-200 shadow-sm">
                <h3 className="font-bold mb-2">อัตราส่วนนักเรียน:ครู</h3>
                <p className="text-3xl font-extrabold">{avgRatio}:1</p>
              </div>
              {/* จำนวนโรงเรียนทั้งหมด */}
              <div className="p-4 bg-white border border-gray-200 shadow-sm">
                <h3 className="font-bold mb-2">จำนวนโรงเรียนทั้งหมด</h3>
                <p className="text-3xl font-extrabold">{totalSchools.toLocaleString()}</p>
              </div>
              {/* จำนวนนักเรียนทั้งหมด */}
              <div className="p-4 bg-white border border-gray-200 shadow-sm">
                <h3 className="font-bold mb-2">จำนวนนักเรียนทั้งหมด</h3>
                <p className="text-3xl font-extrabold">{totalStudents.toLocaleString()}</p>
              </div>
            </div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      
  {/* Province Bar Chart */}
  <div className="border border-gray-200 p-4">
    <h3 className="text-xl font-semibold mb-2">จำนวนนักเรียนแต่ละจังหวัด</h3>
    {provinceData.map(([province, count], index) => (
      <div key={province} className="flex items-center mb-2">
        <span className="w-32 text-sm font-medium text-gray-700">{province}</span>
        <div className="flex-1 h-4 bg-gray-200 overflow-hidden mr-2">
          <div className="h-full"
            style={{
              width: `${(count / maxProvince) * 100}%`,
              background: barGradients[index % barGradients.length],
            }}
          />
        </div>
        <span className="text-sm font-medium text-gray-800">{count.toLocaleString()}</span>
      </div>
    ))}
  </div>

  {/* District Bar Chart */}
  <div className="border border-gray-200 p-4">
    <h3 className="text-xl font-semibold mb-2">จำนวนนักเรียนแยกตามอำเภอ</h3>
    {districtData.map(([district, count], index) => (
      <div key={district} className="flex items-center mb-2">
        <span className="w-32 text-sm font-medium text-gray-700">{district}</span>
        <div className="flex-1 h-4 bg-gray-200 overflow-hidden mr-2">
          <div className="h-full"
            style={{
              width: `${(count / maxStudents) * 100}%`,
              background: barGradients[index % barGradients.length],
            }}
          />
        </div>
        <span className="text-sm font-medium text-gray-800">{count.toLocaleString()}</span>
      </div>
    ))}
  </div>
</div>

  {/* Donut Chart – border-only card with transparent background */}
  <div className="border border-gray-200 p-4 bg-transparent">
    <h3 className="text-xl font-semibold mb-2">สัดส่วนขนาดโรงเรียน</h3>
    <div className="chart-card mb-8">
      <div className="chart-card__body">
        <div className="donut-chart" style={{ background: totalSchools > 0 ? `conic-gradient(${donutGradient})` : '#e2e8f0' }}>
          <div className="donut-chart__center">
            <div className="donut-chart__center-value">{totalSchools}</div>
            <div className="donut-chart__center-label">โรงเรียน</div>
          </div>
                        </div>
                      </div>
                      <div className="donut-legend">
                        {donutSegments.map((seg) => (
                          <div key={seg.label} className="donut-legend__item">
                            <div className="donut-legend__dot" style={{ background: seg.color }} />
                            {seg.label} ({seg.value})
                          </div>
                        ))}
              </div>
            </div>
          </div>

          {/* Thailand Map Section */}
          <div className="mt-8">
            <ThailandMap schools={allSchools} />
          </div>
          </section>
        </div>
      )}

      {/* Placeholder for Schools tab – can be expanded later */}
      {activeTab === 'schools' && (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <p className="text-gray-600">// TODO: implement school list view</p>
        </div>
      )}
    </div>
  );
}