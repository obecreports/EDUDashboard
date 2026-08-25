import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  User,
  Building,
  BookOpen,
  Users,
  GraduationCap,
  Wifi,
  Monitor,
  Droplets,
  Zap,
  Award,
  FileText,
  ChevronRight,
  Calendar,
  Ruler,
  Library,
  Dumbbell,
  FlaskConical,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { getSchoolById } from '../data/mockSchools';
import type { QualityLevel, SchoolFull } from '../types/school';

const tabs = [
  { id: 'overview', label: 'ภาพรวม', icon: Eye },
  { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: Building },
  { id: 'students', label: 'ข้อมูลนักเรียน', icon: Users },
  { id: 'personnel', label: 'ข้อมูลบุคลากร', icon: GraduationCap },
  { id: 'infrastructure', label: 'โครงสร้างพื้นฐาน', icon: Building },
  { id: 'assessment', label: 'ผลการประเมิน', icon: Award },
];

function qualityClass(level: QualityLevel): string {
  return `school-card__badge badge--${level.toLowerCase()}`;
}

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const school = getSchoolById(id || '');
  const [activeTab, setActiveTab] = useState('overview');

  if (!school) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>ไม่พบข้อมูลโรงเรียน</h2>
        <Link to="/schools" style={{ marginTop: '16px', display: 'inline-block' }}>
          ← กลับไปรายชื่อโรงเรียน
        </Link>
      </div>
    );
  }

  const ratio =
    school.personnelSummary.totalPersonnel > 0
      ? (school.studentSummary.totalStudents / school.personnelSummary.totalPersonnel).toFixed(1)
      : 'N/A';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">หน้าหลัก</Link>
        <ChevronRight size={14} className="breadcrumb__sep" />
        <Link to="/schools">โรงเรียน</Link>
        <ChevronRight size={14} className="breadcrumb__sep" />
        <span>{school.school_name_th}</span>
      </div>

      {/* Banner */}
      <div className="school-banner">
        <div className="school-banner__content">
          <h1 className="school-banner__name">{school.school_name_th}</h1>
          <div className="school-banner__name-en">{school.school_name_en}</div>
          <div className="school-banner__meta">
            <div className="school-banner__meta-item">
              <MapPin size={16} />
              {school.subdistrict}, {school.district}, {school.province}
            </div>
            <div className="school-banner__meta-item">
              <Phone size={16} />
              {school.phone}
            </div>
            <div className="school-banner__meta-item">
              <User size={16} />
              {school.director_name}
            </div>
            <div className="school-banner__meta-item">
              <span className={qualityClass(school.assessment.quality_level)}
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {school.assessment.quality_level}
              </span>
            </div>
          </div>
          <div className="school-banner__stats">
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">
                {school.studentSummary.totalStudents.toLocaleString()}
              </div>
              <div className="school-banner__stat-label">นักเรียน</div>
            </div>
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">
                {school.personnelSummary.totalPersonnel}
              </div>
              <div className="school-banner__stat-label">บุคลากร</div>
            </div>
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">{school.studentSummary.totalClassrooms}</div>
              <div className="school-banner__stat-label">ห้องเรียน</div>
            </div>
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">{ratio}:1</div>
              <div className="school-banner__stat-label">นร./ครู</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <ul className="tabs__list">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <li
                key={tab.id}
                className={`tabs__item ${activeTab === tab.id ? 'tabs__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Tab Content */}
      <div className="tabs__content" key={activeTab}>
        {activeTab === 'overview' && <OverviewTab school={school} />}
        {activeTab === 'basic' && <BasicInfoTab school={school} />}
        {activeTab === 'students' && <StudentsTab school={school} />}
        {activeTab === 'personnel' && <PersonnelTab school={school} />}
        {activeTab === 'infrastructure' && <InfrastructureTab school={school} />}
        {activeTab === 'assessment' && <AssessmentTab school={school} />}
      </div>
    </div>
  );
}

/* =====================================================
   TAB 1: ข้อมูลพื้นฐาน
   ===================================================== */
function BasicInfoTab({ school }: { school: ReturnType<typeof getSchoolById> }) {
  if (!school) return null;
  return (
    <>
      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <Building size={18} className="data-table-wrapper__title-icon" />
          ข้อมูลทั่วไป
        </div>
        <div className="info-grid" style={{ padding: '20px 24px' }}>
          <InfoItem icon={<FileText size={18} />} label="รหัสโรงเรียน" value={school.school_id} />
          <InfoItem icon={<Building size={18} />} label="ชื่อโรงเรียน (ไทย)" value={school.school_name_th} />
          <InfoItem icon={<Building size={18} />} label="ชื่อโรงเรียน (EN)" value={school.school_name_en} />
          <InfoItem icon={<MapPin size={18} />} label="ที่อยู่" value={`${school.address} ต.${school.subdistrict} อ.${school.district} จ.${school.province} ${school.zipcode}`} />
          <InfoItem icon={<Phone size={18} />} label="โทรศัพท์" value={school.phone} />
          <InfoItem icon={<BookOpen size={18} />} label="สังกัด" value={school.affiliation} />
          <InfoItem icon={<BookOpen size={18} />} label="ระดับชั้นที่เปิดสอน" value={school.education_levels} />
          <InfoItem icon={<Ruler size={18} />} label="ขนาดโรงเรียน" value={`ขนาด${school.school_size}`} />
          <InfoItem icon={<User size={18} />} label="ผู้อำนวยการ" value={school.director_name} />
          <InfoItem icon={<Phone size={18} />} label="โทร ผอ." value={school.director_phone} />
          <InfoItem icon={<MapPin size={18} />} label="พิกัด GPS" value={`${school.latitude}, ${school.longitude}`} />
          <InfoItem icon={<Calendar size={18} />} label="อัปเดตล่าสุด" value={school.updated_at} />
        </div>
      </div>
    </>
  );
}

/* =====================================================
   TAB 2: ข้อมูลนักเรียน
   ===================================================== */
function StudentsTab({ school }: { school: ReturnType<typeof getSchoolById> }) {
  if (!school) return null;
  const students = school.students;
  const summary = school.studentSummary;

  return (
    <>
      {/* Summary stat cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><Users size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">นักเรียนทั้งหมด</div>
            <div className="stat-card__value">{summary.totalStudents.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><Users size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">นักเรียนชาย</div>
            <div className="stat-card__value">{summary.totalMale.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple"><Users size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">นักเรียนหญิง</div>
            <div className="stat-card__value">{summary.totalFemale.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber"><BookOpen size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">ห้องเรียนรวม</div>
            <div className="stat-card__value">{summary.totalClassrooms}</div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <Users size={18} className="data-table-wrapper__title-icon" />
          จำนวนนักเรียนแยกตามชั้นเรียน (ปีการศึกษา 2567)
        </div>
        <table className="data-table data-table--striped">
          <thead>
            <tr>
              <th>ระดับชั้น</th>
              <th className="text-right">ชาย</th>
              <th className="text-right">หญิง</th>
              <th className="text-right">รวม</th>
              <th className="text-right">ห้องเรียน</th>
              <th className="text-right">นร.พิการ</th>
              <th className="text-right">นร.ด้อยโอกาส</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.grade_level}>
                <td className="font-bold">{s.grade_level}</td>
                <td className="text-right">{s.male_count}</td>
                <td className="text-right">{s.female_count}</td>
                <td className="text-right font-bold">{s.total}</td>
                <td className="text-right">{s.classrooms}</td>
                <td className="text-right">{s.disabled_students}</td>
                <td className="text-right">{s.disadvantaged_students}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>รวมทั้งหมด</td>
              <td className="text-right">{summary.totalMale}</td>
              <td className="text-right">{summary.totalFemale}</td>
              <td className="text-right">{summary.totalStudents}</td>
              <td className="text-right">{summary.totalClassrooms}</td>
              <td className="text-right">{students.reduce((s, r) => s + r.disabled_students, 0)}</td>
              <td className="text-right">{students.reduce((s, r) => s + r.disadvantaged_students, 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =====================================================
   TAB 3: ข้อมูลบุคลากร
   ===================================================== */
function PersonnelTab({ school }: { school: ReturnType<typeof getSchoolById> }) {
  if (!school) return null;
  const personnel = school.personnel;
  const summary = school.personnelSummary;

  return (
    <>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><GraduationCap size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">บุคลากรทั้งหมด</div>
            <div className="stat-card__value">{summary.totalPersonnel}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><Users size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">ชาย</div>
            <div className="stat-card__value">{summary.totalMale}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple"><Users size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">หญิง</div>
            <div className="stat-card__value">{summary.totalFemale}</div>
          </div>
        </div>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <GraduationCap size={18} className="data-table-wrapper__title-icon" />
          จำนวนบุคลากรแยกตามประเภท (ปีการศึกษา 2567)
        </div>
        <table className="data-table data-table--striped">
          <thead>
            <tr>
              <th>ประเภทตำแหน่ง</th>
              <th className="text-right">ชาย</th>
              <th className="text-right">หญิง</th>
              <th className="text-right">รวม</th>
              <th className="text-right">ป.ตรี</th>
              <th className="text-right">ป.โท</th>
              <th className="text-right">ป.เอก</th>
              <th>วิชาเอก</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map(p => (
              <tr key={p.position_type}>
                <td className="font-bold">{p.position_type}</td>
                <td className="text-right">{p.male_count}</td>
                <td className="text-right">{p.female_count}</td>
                <td className="text-right font-bold">{p.male_count + p.female_count}</td>
                <td className="text-right">{p.education_bachelor}</td>
                <td className="text-right">{p.education_master}</td>
                <td className="text-right">{p.education_doctor}</td>
                <td>{p.subject_major}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>รวมทั้งหมด</td>
              <td className="text-right">{summary.totalMale}</td>
              <td className="text-right">{summary.totalFemale}</td>
              <td className="text-right">{summary.totalPersonnel}</td>
              <td className="text-right">{personnel.reduce((s, p) => s + p.education_bachelor, 0)}</td>
              <td className="text-right">{personnel.reduce((s, p) => s + p.education_master, 0)}</td>
              <td className="text-right">{personnel.reduce((s, p) => s + p.education_doctor, 0)}</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =====================================================
   TAB 4: โครงสร้างพื้นฐาน
   ===================================================== */
function InfrastructureTab({ school }: { school: ReturnType<typeof getSchoolById> }) {
  if (!school) return null;
  const infra = school.infrastructure;

  return (
    <div className="data-table-wrapper">
      <div className="data-table-wrapper__title">
        <Building size={18} className="data-table-wrapper__title-icon" />
        ข้อมูลโครงสร้างพื้นฐาน (ปีการศึกษา 2567)
      </div>
      <div className="info-grid" style={{ padding: '20px 24px' }}>
        <InfoItem icon={<Building size={18} />} label="จำนวนอาคารเรียน" value={`${infra.buildings_count} หลัง`} />
        <InfoItem icon={<Building size={18} />} label="สภาพอาคาร" value={infra.buildings_condition} />
        <InfoItem icon={<FlaskConical size={18} />} label="ห้องปฏิบัติการ" value={`${infra.labs_count} ห้อง (${infra.labs_type})`} />
        <InfoItem icon={<Library size={18} />} label="ห้องสมุด" value={`${infra.library_status ? 'มี' : 'ไม่มี'} - สภาพ${infra.library_condition}`} />
        <InfoItem icon={<Dumbbell size={18} />} label="สนามกีฬา" value={infra.sports_facilities} />
        <InfoItem icon={<Wifi size={18} />} label="อินเทอร์เน็ต" value={`${infra.internet_type} (${infra.internet_speed})`} />
        <InfoItem icon={<Monitor size={18} />} label="คอมพิวเตอร์" value={`${infra.computers_count} เครื่อง`} />
        <InfoItem icon={<Droplets size={18} />} label="แหล่งน้ำ" value={infra.water_source} />
        <InfoItem icon={<Zap size={18} />} label="ระบบไฟฟ้า" value={infra.electricity_status} />
      </div>
    </div>
  );
}

/* =====================================================
   TAB 5: ผลการประเมิน
   ===================================================== */
function AssessmentTab({ school }: { school: ReturnType<typeof getSchoolById> }) {
  if (!school) return null;
  const a = school.assessment;

  const onetData = [
    { label: 'ภาษาไทย', score: a.onet_thai, max: 100 },
    { label: 'คณิตศาสตร์', score: a.onet_math, max: 100 },
    { label: 'ภาษาอังกฤษ', score: a.onet_english, max: 100 },
    { label: 'วิทยาศาสตร์', score: a.onet_science, max: 100 },
  ];

  const getScoreColor = (score: number): string => {
    if (score >= 60) return 'var(--excellent)';
    if (score >= 50) return 'var(--great)';
    if (score >= 40) return 'var(--good)';
    if (score >= 30) return 'var(--fair)';
    return 'var(--developing)';
  };

  return (
    <>
      {/* Quality Level Banner */}
      <div className="stat-cards">
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <div className="stat-card__icon stat-card__icon--green"><Award size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">ระดับคุณภาพโรงเรียน</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span className={qualityClass(a.quality_level)} style={{ fontSize: '1rem', padding: '6px 16px' }}>
                {a.quality_level}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ประเมินเมื่อ {a.assessment_date}
              </span>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber"><BookOpen size={24} /></div>
          <div className="stat-card__info">
            <div className="stat-card__label">GPA เฉลี่ย</div>
            <div className="stat-card__value">{a.average_gpa}</div>
          </div>
        </div>
      </div>

      {/* O-NET Scores */}
      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <Award size={18} className="data-table-wrapper__title-icon" />
          คะแนน O-NET (ปีการศึกษา 2567)
        </div>
        <div style={{ padding: '24px' }}>
          <div className="bar-chart">
            {onetData.map(item => (
              <div className="bar-chart__item" key={item.label}>
                <div className="bar-chart__label">{item.label}</div>
                <div className="bar-chart__track">
                  <div
                    className="bar-chart__fill"
                    style={{
                      width: `${item.score}%`,
                      background: getScoreColor(item.score),
                    }}
                  >
                    {item.score.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <FileText size={18} className="data-table-wrapper__title-icon" />
          สรุปผลการประเมินรายวิชา
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>วิชา</th>
              <th className="text-right">คะแนน</th>
              <th className="text-right">คะแนนเต็ม</th>
              <th className="text-right">เปอร์เซ็นต์</th>
              <th>ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {onetData.map(item => (
              <tr key={item.label}>
                <td className="font-bold">{item.label}</td>
                <td className="text-right">{item.score.toFixed(2)}</td>
                <td className="text-right">100</td>
                <td className="text-right">{item.score.toFixed(2)}%</td>
                <td>
                  <span style={{
                    color: getScoreColor(item.score),
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}>
                    {item.score >= 60 ? 'ดีมาก' : item.score >= 50 ? 'ดี' : item.score >= 40 ? 'พอใช้' : item.score >= 30 ? 'ปรับปรุง' : 'ต้องปรับปรุง'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =====================================================
   Shared: InfoItem Component
   ===================================================== */
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-item">
      <div className="info-item__icon">{icon}</div>
      <div className="info-item__content">
        <div className="info-item__label">{label}</div>
        <div className="info-item__value">{value}</div>
      </div>
    </div>
  );
}

/* =====================================================
   TAB 0: Overview (ภาพรวม)
   ===================================================== */
function OverviewTab({ school }: { school: SchoolFull }) {
  return (
    <div>
      <div className="overview-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* School Owner Position & Profile Pic */}
          <div className="overview-card">
            <div className="overview-card__header">
              <User size={16} className="overview-card__header-icon" />
              <span>ผู้บริหารสถานศึกษา</span>
            </div>
            <div className="profile-card">
              <div className="profile-card__avatar">
                <User size={40} className="text-green" />
              </div>
              <div className="profile-card__info">
                <div className="profile-card__name">{school.director_name}</div>
                <div className="profile-card__title">{school.director_title}</div>
                <div className="profile-card__contact">
                  <Phone size={14} />
                  <span>{school.director_phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* School Picture */}
          <div className="overview-card">
            <div className="overview-card__header">
              <Building size={16} className="overview-card__header-icon" />
              <span>ภาพถ่ายสถานศึกษา</span>
            </div>
            <div className="overview-card__body">
              <div className="school-image-placeholder">
                <Building size={48} />
                <span>[ รูปภาพโรงเรียน {school.school_name_th} ]</span>
              </div>
            </div>
          </div>

          {/* Map Location */}
          <div className="overview-card">
            <div className="overview-card__header">
              <MapPin size={16} className="overview-card__header-icon" />
              <span>แผนที่ตั้งโรงเรียน (Google Maps / OpenStreetMap)</span>
            </div>
            <div className="overview-card__body" style={{ padding: '12px' }}>
              <div className="map-container">
                <iframe
                  title="School Location Map"
                  src={`https://maps.google.com/maps?q=${school.latitude},${school.longitude}&z=14&output=embed`}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Spider Chart Card */}
          <div className="overview-card">
            <div className="overview-card__header">
              <Award size={16} className="overview-card__header-icon" />
              <span>ผลประเมิน 5 เสาหลัก (School Grading Spider Chart)</span>
            </div>
            <div className="overview-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <SpiderChart scores={school.pillarScores} />
              
              <div className="pillar-scores">
                <PillarProgressBar label="1. ด้านผู้เรียน" score={school.pillarScores.learner} />
                <PillarProgressBar label="2. ด้านการมีส่วนร่วม" score={school.pillarScores.participation} />
                <PillarProgressBar label="3. ด้านผู้สอนและผู้บริหาร" score={school.pillarScores.teacherAdmin} />
                <PillarProgressBar label="4. ด้านหลักสูตรและการสอน" score={school.pillarScores.curriculum} />
                <PillarProgressBar label="5. ด้านโครงสร้างพื้นฐาน" score={school.pillarScores.infrastructure} />
              </div>
            </div>
          </div>

          {/* Basic Infrastructure */}
          <div className="overview-card">
            <div className="overview-card__header">
              <Building size={16} className="overview-card__header-icon" />
              <span>โครงสร้างพื้นฐานหลัก</span>
            </div>
            <div className="overview-card__body">
              <div className="infra-mini-grid">
                <InfraMiniItem icon={<Building size={16} />} label="อาคารเรียน" value={`${school.infrastructure.buildings_count} หลัง`} />
                <InfraMiniItem icon={<FlaskConical size={16} />} label="ห้องปฏิบัติการ" value={`${school.infrastructure.labs_count} ห้อง`} />
                <InfraMiniItem icon={<Wifi size={16} />} label="อินเทอร์เน็ต" value={school.infrastructure.internet_type} />
                <InfraMiniItem icon={<Monitor size={16} />} label="คอมพิวเตอร์" value={`${school.infrastructure.computers_count} เครื่อง`} />
              </div>
            </div>
          </div>

          {/* Weaknesses */}
          <div className="overview-card">
            <div className="overview-card__header" style={{ borderBottomColor: '#fecaca', background: '#fff5f5' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
              <span style={{ color: '#b91c1c' }}>จุดที่ต้องได้รับการพัฒนา (Weaknesses / Needs)</span>
            </div>
            <div className="overview-card__body" style={{ background: '#fff5f5' }}>
              <div className="weakness-list">
                {school.weaknesses.map((w: string, idx: number) => (
                  <div className="weakness-item" key={idx}>
                    <AlertTriangle className="weakness-item__icon" size={16} />
                    <span className="weakness-item__text">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* =====================================================
   SVG Spider Chart Component
   ===================================================== */
function SpiderChart({ scores }: { scores: SchoolFull['pillarScores'] }) {
  const center = 150;
  const maxVal = 5;
  const radius = 80;

  // Helper to calculate coordinates
  const getCoordinates = (index: number, value: number) => {
    // 5 pillars: 72 degrees angle step
    const angle = (Math.PI * 2 / 5) * index - Math.PI / 2;
    const r = (value / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate grid level lines (1 to 5)
  const levels = [1, 2, 3, 4, 5];
  const gridPolygons = levels.map((level: number) => {
    return Array.from({ length: 5 }).map((_, idx: number) => {
      const { x, y } = getCoordinates(idx, level);
      return `${x},${y}`;
    }).join(' ');
  });

  // Score coordinates mapping:
  // index 0 -> learner, 1 -> participation, 2 -> teacherAdmin, 3 -> curriculum, 4 -> infrastructure
  const scorePoints = [
    getCoordinates(0, scores.learner),
    getCoordinates(1, scores.participation),
    getCoordinates(2, scores.teacherAdmin),
    getCoordinates(3, scores.curriculum),
    getCoordinates(4, scores.infrastructure),
  ];
  const scorePath = scorePoints.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');

  const labelNames = [
    'ด้านผู้เรียน',
    'ด้านการมีส่วนร่วม',
    'ด้านผู้สอน/ผู้บริหาร',
    'ด้านหลักสูตร/การสอน',
    'ด้านโครงสร้างพื้นฐาน',
  ];

  const labelCoords = labelNames.map((name: string, idx: number) => {
    const angle = (Math.PI * 2 / 5) * idx - Math.PI / 2;
    const labelRadius = radius + 22;
    // Offset labels slightly for aesthetic positioning
    let yOffset = 0;
    if (idx === 0) yOffset = -5;
    if (idx === 1 || idx === 4) yOffset = -3;
    if (idx === 2 || idx === 3) yOffset = 12;

    return {
      name,
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle) + yOffset,
    };
  });

  return (
    <div className="spider-chart-container">
      <svg className="spider-chart-svg" viewBox="0 0 300 300">
        {/* Radar grids */}
        {gridPolygons.map((points: string, idx: number) => (
          <polygon key={idx} points={points} className="spider-chart__grid-line" />
        ))}

        {/* Radar axes */}
        {Array.from({ length: 5 }).map((_, idx: number) => {
          const outer = getCoordinates(idx, 5);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              className="spider-chart__axis"
            />
          );
        })}

        {/* Radar path area filled */}
        <polygon points={scorePath} className="spider-chart__area" />

        {/* Score dots */}
        {scorePoints.map((p: { x: number; y: number }, idx: number) => (
          <circle key={idx} cx={p.x} cy={p.y} r={4} className="spider-chart__point" />
        ))}

        {/* Labels & scores */}
        {labelCoords.map((l: { name: string; x: number; y: number }, idx: number) => {
          const keys: Array<keyof SchoolFull['pillarScores']> = ['learner', 'participation', 'teacherAdmin', 'curriculum', 'infrastructure'];
          const val = scores[keys[idx]];
          return (
            <g key={idx}>
              <text x={l.x} y={l.y} className="spider-chart__label">
                {l.name}
              </text>
              <text x={l.x} y={l.y + 11} className="spider-chart__score">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* =====================================================
   Small UI Helper Components
   ===================================================== */
function InfraMiniItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="infra-mini-item">
      <div className="infra-mini-item__icon">{icon}</div>
      <div>
        <div className="infra-mini-item__label">{label}</div>
        <div className="infra-mini-item__value">{value}</div>
      </div>
    </div>
  );
}

function PillarProgressBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 5) * 100;
  return (
    <div className="pillar-score-item">
      <div className="pillar-score-item__label">{label}</div>
      <div className="pillar-score-item__bar-track">
        <div
          className="pillar-score-item__bar-fill"
          style={{ width: `${percentage}%` }}
        >
          {score.toFixed(1)} / 5.0
        </div>
      </div>
    </div>
  );
}
