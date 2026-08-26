import { School, Users, GraduationCap, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchSchools } from '../services/supabase';
import { useEffect, useState } from 'react';
import type { SchoolFull } from '../types/school';

export default function Dashboard() {
  const [allSchools, setAllSchools] = useState<SchoolFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      <div style={{ color: '#dc2626', padding: '1rem', background: '#fee2e2', borderRadius: '8px', marginBottom: '1rem' }}>
        เกิดข้อผิดพลาดในการโหลดข้อมูล: {errorMsg}
      </div>
    );
  }

  const totalSchools = allSchools.length;
  const totalStudents = allSchools.reduce((sum, s) => sum + (s.studentSummary?.totalStudents ?? 0), 0);
  const totalPersonnel = allSchools.reduce((sum, s) => sum + (s.personnelSummary?.totalPersonnel ?? 0), 0);
  const avgRatio = totalStudents > 0 && totalPersonnel > 0
    ? (totalStudents / totalPersonnel).toFixed(1)
    : '0';

  // Size distribution
  const sizeDistribution = {
    'เล็ก': allSchools.filter(s => s.school_size === 'เล็ก').length,
    'กลาง': allSchools.filter(s => s.school_size === 'กลาง').length,
    'ใหญ่': allSchools.filter(s => s.school_size === 'ใหญ่').length,
    'ใหญ่พิเศษ': allSchools.filter(s => s.school_size === 'ใหญ่พิเศษ').length,
  };

  // District distribution for bar chart
  const districtMap = new Map<string, number>();
  allSchools.forEach(s => {
    const d = s.district || 'ไม่ระบุ';
    districtMap.set(d, (districtMap.get(d) || 0) + (s.studentSummary?.totalStudents ?? 0));
  });
  const districtData = Array.from(districtMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxStudents = Math.max(...districtData.map(d => d[1]), 1);

  // Recent updates
  const recentSchools = [...allSchools]
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 8);

  // Donut chart logic (Colorful palette: Navy Blue, Gold, Pink, Purple)
  const donutColors = ['#1d3d6f', '#ca8a04', '#ec4899', '#8b5cf6'];
  const sizeEntries = Object.entries(sizeDistribution);
  const total = sizeEntries.reduce((s, [, v]) => s + v, 0);
  let cumulativePercent = 0;
  const donutSegments = sizeEntries.map(([label, value], i) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    const start = cumulativePercent;
    cumulativePercent += percent;
    return { label, value, percent, start, color: donutColors[i] };
  });

  const donutGradient = donutSegments
    .map(seg => `${seg.color} ${seg.start}% ${seg.start + seg.percent}%`)
    .join(', ');

  // Colorful gradients for the district bar chart
  const barGradients = [
    'linear-gradient(90deg, #1d3d6f 0%, #38a8f8 100%)', // Navy to Light Blue
    'linear-gradient(90deg, #ca8a04 0%, #fde047 100%)', // Gold to Light Yellow
    'linear-gradient(90deg, #db2777 0%, #f472b6 100%)', // Pink to Rose
    'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)', // Purple to Lavender
    'linear-gradient(90deg, #0d9488 0%, #2dd4bf 100%)', // Teal to Turquoise
    'linear-gradient(90deg, #ea580c 0%, #ffedd5 100%)', // Orange to Cream
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Dashboard</h1>
        <p className="page-header__subtitle">
          ภาพรวมข้อมูลโรงเรียนในสังกัด
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--gold">
            <School size={24} />
          </div>
          <div className="stat-card__info">
            <div className="stat-card__label">จำนวนโรงเรียน</div>
            <div className="stat-card__value">{totalSchools}</div>
            <div className="stat-card__change stat-card__change--up">
              <ArrowUpRight size={14} /> ข้อมูลล่าสุด
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <Users size={24} />
          </div>
          <div className="stat-card__info">
            <div className="stat-card__label">จำนวนนักเรียนรวม</div>
            <div className="stat-card__value">{totalStudents.toLocaleString()}</div>
            <div className="stat-card__change stat-card__change--up">
              <ArrowUpRight size={14} /> รวมทุกโรงเรียน
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">
            <GraduationCap size={24} />
          </div>
          <div className="stat-card__info">
            <div className="stat-card__label">จำนวนบุคลากรรวม</div>
            <div className="stat-card__value">{totalPersonnel.toLocaleString()}</div>
            <div className="stat-card__change stat-card__change--up">
              <ArrowUpRight size={14} /> ครูและบุคลากร
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <TrendingUp size={24} />
          </div>
          <div className="stat-card__info">
            <div className="stat-card__label">อัตราส่วนนักเรียน:ครู</div>
            <div className="stat-card__value">{avgRatio}:1</div>
            <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
              ค่าเฉลี่ยทุกโรงเรียน
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Bar Chart - Students by District */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">จำนวนนักเรียนแยกตามอำเภอ</div>
          </div>
          <div className="chart-card__body">
            <div className="bar-chart">
              {districtData.map(([district, count], index) => (
                <div className="bar-chart__item" key={district}>
                  <div className="bar-chart__label">{district}</div>
                  <div className="bar-chart__track">
                    <div
                      className="bar-chart__fill"
                      style={{
                        width: `${(count / maxStudents) * 100}%`,
                        background: barGradients[index % barGradients.length],
                        border: '1.5px solid var(--white)',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      {count.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut Chart - Size Distribution */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">สัดส่วนขนาดโรงเรียน</div>
          </div>
          <div className="chart-card__body">
            <div
              className="donut-chart"
              style={{
                background: total > 0 ? `conic-gradient(${donutGradient})` : '#e2e8f0',
              }}
            >
              <div className="donut-chart__center">
                <div className="donut-chart__center-value">{totalSchools}</div>
                <div className="donut-chart__center-label">โรงเรียน</div>
              </div>
            </div>
            <div className="donut-legend">
              {donutSegments.map(seg => (
                <div className="donut-legend__item" key={seg.label}>
                  <div className="donut-legend__dot" style={{ background: seg.color }} />
                  {seg.label} ({seg.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="chart-card" style={{ marginTop: '24px' }}>
        <div className="chart-card__header">
          <div className="chart-card__title">อัปเดตล่าสุด</div>
        </div>
        <div className="recent-list">
          {recentSchools.map(school => (
            <Link
              to={`/schools/${school.school_id}`}
              key={school.school_id}
              className="recent-item"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="recent-item__dot" />
              <div className="recent-item__name">{school.school_name_th || (school as any).school_name || school.school_id}</div>
              <div className="recent-item__date">{(school as any).updated_at || '-'}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}