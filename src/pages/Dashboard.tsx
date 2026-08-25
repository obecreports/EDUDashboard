import {
  School,
  Users,
  GraduationCap,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAllSchoolsFull } from '../data/mockSchools';

export default function Dashboard() {
  const allSchools = getAllSchoolsFull();

  const totalSchools = allSchools.length;
  const totalStudents = allSchools.reduce((sum, s) => sum + s.studentSummary.totalStudents, 0);
  const totalPersonnel = allSchools.reduce((sum, s) => sum + s.personnelSummary.totalPersonnel, 0);
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
    const d = s.district;
    districtMap.set(d, (districtMap.get(d) || 0) + s.studentSummary.totalStudents);
  });
  const districtData = Array.from(districtMap.entries())
    .sort((a, b) => b[1] - a[1]);
  const maxStudents = Math.max(...districtData.map(d => d[1]));

  // Quality distribution
  const qualityMap = new Map<string, number>();
  allSchools.forEach(s => {
    const q = s.assessment.quality_level;
    qualityMap.set(q, (qualityMap.get(q) || 0) + 1);
  });

  // Recent updates
  const recentSchools = [...allSchools]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8);

  // Donut chart
  const donutColors = ['#16a34a', '#22c55e', '#84cc16', '#facc15'];
  const sizeEntries = Object.entries(sizeDistribution);
  const total = sizeEntries.reduce((s, [, v]) => s + v, 0);
  let cumulativePercent = 0;
  const donutSegments = sizeEntries.map(([label, value], i) => {
    const percent = (value / total) * 100;
    const start = cumulativePercent;
    cumulativePercent += percent;
    return { label, value, percent, start, color: donutColors[i] };
  });

  const donutGradient = donutSegments
    .map(seg => `${seg.color} ${seg.start}% ${seg.start + seg.percent}%`)
    .join(', ');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Dashboard</h1>
        <p className="page-header__subtitle">
          ภาพรวมข้อมูลโรงเรียนในสังกัด • ปีการศึกษา 2567
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
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
              <ArrowUpRight size={14} /> ปี 2567
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

      {/* Charts */}
      <div className="charts-grid">
        {/* Bar Chart - Students by District */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">จำนวนนักเรียนแยกตามอำเภอ</div>
          </div>
          <div className="chart-card__body">
            <div className="bar-chart">
              {districtData.map(([district, count]) => (
                <div className="bar-chart__item" key={district}>
                  <div className="bar-chart__label">{district}</div>
                  <div className="bar-chart__track">
                    <div
                      className="bar-chart__fill"
                      style={{ width: `${(count / maxStudents) * 100}%` }}
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
                background: `conic-gradient(${donutGradient})`,
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

      {/* Quality Distribution + Recent Updates */}
      <div className="charts-grid">
        {/* Quality Bar Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">ระดับคุณภาพโรงเรียน</div>
          </div>
          <div className="chart-card__body">
            <div className="bar-chart">
              {['Excellent', 'Great', 'Good', 'Fair', 'Developing'].map(level => {
                const count = qualityMap.get(level) || 0;
                const colors: Record<string, string> = {
                  Excellent: 'var(--excellent)',
                  Great: 'var(--great)',
                  Good: 'var(--good)',
                  Fair: 'var(--fair)',
                  Developing: 'var(--developing)',
                };
                return (
                  <div className="bar-chart__item" key={level}>
                    <div className="bar-chart__label">{level}</div>
                    <div className="bar-chart__track">
                      <div
                        className="bar-chart__fill"
                        style={{
                          width: `${(count / totalSchools) * 100}%`,
                          background: colors[level],
                          minWidth: count > 0 ? '40px' : '0px',
                        }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="chart-card">
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
                <div className="recent-item__name">{school.school_name_th}</div>
                <div className="recent-item__date">{school.updated_at}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
