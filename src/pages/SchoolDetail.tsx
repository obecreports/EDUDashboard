import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  User,
  Building,
  BookOpen,
  Users,
  GraduationCap,
  Award,
  ChevronRight,
  Ruler,
  FileText,
} from 'lucide-react';
import { fetchSchoolById, supabase } from '../services/supabase';
import type { SchoolFull } from '../types/school';

const tabs = [
  { id: 'overview', label: 'ภาพรวม', icon: Building },
  { id: 'basic', label: 'ข้อมูลพื้นฐาน', icon: FileText },
  { id: 'students', label: 'ข้อมูลนักเรียน/บุคลากร', icon: Users },
  { id: 'scores', label: 'KPIs', icon: Award },
];

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<SchoolFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [lookups, setLookups] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await fetchSchoolById(id);
        setSchool(data);

        // Fetch label lookups
        const { data: lookupData, error } = await supabase
          .from('Label_Lookup')
          .select('label_code, label_name');
        if (!error && lookupData) {
          const map: Record<string, string> = {};
          lookupData.forEach((row: any) => {
            if (row.label_code) {
              map[row.label_code.toUpperCase()] = row.label_name;
            }
          });
          setLookups(map);
        }
      } catch (e) {
        console.error('Supabase fetchSchoolById or lookup error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p className="loading-msg">กำลังโหลดข้อมูลโรงเรียน …</p>;
  if (!school) return <p className="error-msg">ไม่พบข้อมูลโรงเรียนที่ต้องการ (รหัสโรงเรียน: {id})</p>;

  const totalStudents = school.studentSummary?.totalStudents ?? 0;
  const totalPersonnel = school.personnelSummary?.totalPersonnel ?? 0;
  const totalClassrooms = school.studentSummary?.totalClassrooms ?? 0;
  const ratio = totalPersonnel > 0 ? (totalStudents / totalPersonnel).toFixed(1) : 'N/A';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">หน้าหลัก</Link>
        <ChevronRight size={14} className="breadcrumb__sep" />
        <Link to="/schools">โรงเรียน</Link>
        <ChevronRight size={14} className="breadcrumb__sep" />
        <span>{school.school_name_th || school.school_name_en || school.school_id}</span>
      </div>

      {/* Banner */}
      <div className="school-banner">
        <div className="school-banner__content">
          <h1 className="school-banner__name">{school.school_name_th || school.school_name_en}</h1>
          <div className="school-banner__name-en">{school.school_name_en}</div>
          <div className="school-banner__meta">
            <div className="school-banner__meta-item">
              <MapPin size={16} />
              ต.{school.subdistrict || '-'} อ.{school.district || '-'} จ.{school.province || '-'}
            </div>
            {school.phone && (
              <div className="school-banner__meta-item">
                <Phone size={16} />
                {school.phone}
              </div>
            )}
          </div>
          <div className="school-banner__stats">
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">{totalStudents.toLocaleString()}</div>
              <div className="school-banner__stat-label">นักเรียน</div>
            </div>
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">{totalPersonnel.toLocaleString()}</div>
              <div className="school-banner__stat-label">บุคลากร</div>
            </div>
            <div className="school-banner__stat">
              <div className="school-banner__stat-value">{totalClassrooms}</div>
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
        {activeTab === 'scores' && <ScoresTab school={school} lookups={lookups} />}
      </div>
    </div>
  );
}

/* Overview Tab */
function OverviewTab({ school }: { school: SchoolFull }) {
  const pillar = school.pillarScores ?? { learner: 0, participation: 0, teacherAdmin: 0, curriculum: 0, infrastructure: 0 };
  const pillarList = [pillar.learner, pillar.participation, pillar.teacherAdmin, pillar.curriculum, pillar.infrastructure];
  const avgScore = pillarList.reduce((a, b) => a + b, 0) / 5;

  // 3 level classification based on score 1-5
  let levelText = 'ปรับปรุง';
  let levelColor = '#dc2626';
  let levelBg = '#fef2f2';
  let levelBorder = '#fecaca';

  if (avgScore >= 3.8) {
    levelText = 'ดีเยี่ยม';
    levelColor = '#16a34a';
    levelBg = '#f0fdf4';
    levelBorder = '#bbf7d0';
  } else if (avgScore >= 2.5) {
    levelText = 'ปานกลาง';
    levelColor = '#d97706';
    levelBg = '#fffbeb';
    levelBorder = '#fde68a';
  }

  return (
    <div className="overview-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Director Profile - Placeholder for new table mapping */}
        <div className="overview-card">
          <div className="overview-card__header">
            <User size={16} className="overview-card__header-icon" />
            <span>ผู้บริหารสถานศึกษา</span>
          </div>
          <div className="profile-card">
            <div className="profile-card__avatar">
              <User size={40} className="text-navy" />
            </div>
            <div className="profile-card__info">
              <div className="profile-card__name" style={{ color: 'var(--text-muted, #64748b)' }}>
                - (รอเชื่อมโยงข้อมูลผู้บริหาร)
              </div>
              <div className="profile-card__title" style={{ fontSize: '0.85rem' }}>
                เตรียมเชื่อมโยงกับตารางผู้บริหารตาม School ID
              </div>
            </div>
          </div>
        </div>

        {/* Location Map Card */}
        <div className="overview-card">
          <div className="overview-card__header">
            <MapPin size={16} className="overview-card__header-icon" />
            <span>ตำแหน่งที่ตั้งโรงเรียน</span>
          </div>
          <div className="overview-card__body" style={{ padding: '12px' }}>
            {school.latitude !== 0 && school.longitude !== 0 ? (
              <div className="map-container">
                <iframe
                  title="School Location Map"
                  src={`https://maps.google.com/maps?q=${school.latitude},${school.longitude}&z=14&output=embed`}
                />
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                ไม่พบพิกัดละติจูด/ลองจิจูดของโรงเรียนนี้
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 5 Pillars Assessment (G01 - G05) */}
        <div className="overview-card">
          <div className="overview-card__header">
            <Award size={16} className="overview-card__header-icon" />
            <span>ผลประเมิน 5 เสาหลัก (School Grading)</span>
          </div>
          <div className="overview-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            {/* Overall Score Box Above Spider Chart */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 18px',
              background: levelBg,
              border: `1px solid ${levelBorder}`,
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>คะแนนภาพรวม 5 เสาหลัก</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: levelColor, lineHeight: 1.2 }}>
                  {avgScore.toFixed(2)} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400 }}>/ 5.00</span>
                </div>
              </div>
              <div style={{
                padding: '6px 16px',
                borderRadius: '20px',
                background: levelColor,
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                {levelText}
              </div>
            </div>

            {/* Spider Chart with Full Scale of 5 */}
            <SpiderChart scores={pillar} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Basic Info Tab */
function BasicInfoTab({ school }: { school: SchoolFull }) {
  // Format address: moo + village_name + subdistrict_name + district_name + province_name
  const addrParts: string[] = [];
  if ((school as any).moo) addrParts.push(`หมู่ ${(school as any).moo}`);
  if ((school as any).village_name) addrParts.push((school as any).village_name);
  if (school.subdistrict || (school as any).subdistrict_name) {
    addrParts.push(`ต.${school.subdistrict || (school as any).subdistrict_name}`);
  }
  if (school.district || (school as any).district_name) {
    addrParts.push(`อ.${school.district || (school as any).district_name}`);
  }
  if (school.province || (school as any).province_name) {
    addrParts.push(`จ.${school.province || (school as any).province_name}`);
  }
  if (school.zipcode || (school as any).zip_code) {
    addrParts.push(school.zipcode || (school as any).zip_code);
  }

  const fullAddress = addrParts.length > 0 ? addrParts.join(' ') : 'ไม่ระบุข้อมูลที่อยู่';
  const areaName = (school as any).area_name || school.organize_domain || '-';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Component 1: Address Card (No Header Label) */}
      <div className="overview-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Map Header */}
        <div style={{ width: '100%', height: '240px', background: '#e2e8f0' }}>
          {school.latitude !== 0 && school.longitude !== 0 ? (
            <iframe
              title="School Location Map"
              src={`https://maps.google.com/maps?q=${school.latitude},${school.longitude}&z=14&output=embed`}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              ไม่พบพิกัด GPS ของโรงเรียน
            </div>
          )}
        </div>

        {/* School Name & Full Address Details */}
        <div style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '10px' }}>
            {school.school_name_th || school.school_name_en}
          </h2>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#475569', fontSize: '0.95rem', marginBottom: '16px' }}>
            <MapPin size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
            <span>{fullAddress}</span>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
              สำนักงานเขตพื้นที่การศึกษา
            </span>
            <span style={{ color: '#1e293b', fontWeight: 500, fontSize: '0.95rem' }}>
              {areaName}
            </span>
          </div>
        </div>
      </div>

      {/* Component 2: Director Component (ผู้บริหารสถานศึกษา) */}
      <div className="overview-card">
        <div className="overview-card__header">
          <User size={16} className="overview-card__header-icon" />
          <span>ผู้บริหารสถานศึกษา</span>
        </div>
        <div className="profile-card" style={{ padding: '20px 24px' }}>
          <div className="profile-card__avatar">
            <User size={40} className="text-navy" />
          </div>
          <div className="profile-card__info">
            <div className="profile-card__name" style={{ color: '#64748b' }}>
              - (รอเชื่อมโยงข้อมูลผู้บริหาร)
            </div>
            <div className="profile-card__title" style={{ fontSize: '0.85rem' }}>
              เตรียมเชื่อมโยงกับตารางผู้บริหารตาม School ID
            </div>
          </div>
        </div>
      </div>

      {/* Component 3: School Meta Component (ข้อมูลประกอบสถานศึกษา) */}
      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <Building size={18} className="data-table-wrapper__title-icon" />
          ข้อมูลประกอบสถานศึกษา
        </div>
        <div className="info-grid" style={{ padding: '20px 24px' }}>
          <InfoItem icon={<FileText size={18} />} label="รหัสโรงเรียน" value={school.school_id} />
          <InfoItem icon={<BookOpen size={18} />} label="สังกัด / เขตพื้นที่" value={school.organize_domain || '-'} />
          <InfoItem icon={<Ruler size={18} />} label="ขนาดโรงเรียน" value={school.school_size ? `ขนาด${school.school_size}` : '-'} />
          <InfoItem icon={<Phone size={18} />} label="เบอร์โทรศัพท์" value={school.phone || '-'} />
          <InfoItem icon={<MapPin size={18} />} label="พิกัด GPS" value={school.latitude && school.longitude ? `${school.latitude}, ${school.longitude}` : '-'} />
        </div>
      </div>
    </div>
  );
}

/* Students & Personnel Summary Tab */
function StudentsTab({ school }: { school: SchoolFull }) {
  const student = school.studentSummary;
  const personnel = school.personnelSummary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <Users size={18} className="data-table-wrapper__title-icon" />
          สรุปจำนวนนักเรียน
        </div>
        <div className="info-grid" style={{ padding: '20px 24px' }}>
          <InfoItem icon={<Users size={18} />} label="นักเรียนทั้งหมด" value={`${student?.totalStudents ?? 0} คน`} />
          <InfoItem icon={<Users size={18} />} label="นักเรียนชาย" value={`${student?.totalMale ?? 0} คน`} />
          <InfoItem icon={<Users size={18} />} label="นักเรียนหญิง" value={`${student?.totalFemale ?? 0} คน`} />
          <InfoItem icon={<BookOpen size={18} />} label="จำนวนห้องเรียน" value={`${student?.totalClassrooms ?? 0} ห้อง`} />
        </div>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-wrapper__title">
          <GraduationCap size={18} className="data-table-wrapper__title-icon" />
          สรุปจำนวนครูและบุคลากร
        </div>
        <div className="info-grid" style={{ padding: '20px 24px' }}>
          <InfoItem icon={<GraduationCap size={18} />} label="บุคลากรรวม" value={`${personnel?.totalPersonnel ?? 0} คน`} />
          <InfoItem icon={<Users size={18} />} label="บุคลากรชาย" value={`${personnel?.totalMale ?? 0} คน`} />
          <InfoItem icon={<Users size={18} />} label="บุคลากรหญิง" value={`${personnel?.totalFemale ?? 0} คน`} />
        </div>
      </div>
    </div>
  );
}

/* Assessment Tab — ConnextED-style table layout */
function ScoresTab({ school, lookups }: { school: SchoolFull; lookups: Record<string, string> }) {
  const scores = school.scores || {};
  const pillar = school.pillarScores || { learner: 0, participation: 0, teacherAdmin: 0, curriculum: 0, infrastructure: 0 };

  // Parse all score entries
  const scoreEntries = Object.entries(scores)
    .filter(([k]) => {
      const ku = k.toUpperCase();
      // Ensure we only include valid indicator keys (e.g. S01_score, G01) and exclude SCHOOL_NAME
      return /^[A-Z]\d+(_SCORE)?$/.test(ku);
    })
    .map(([k, v]) => ({
      key: k.toUpperCase(),
      val: parseFloat(String(v)) || 0,
      rawKey: k
    }));

  // Exclude G-level (overall) keys for sub-indicators
  const cleanEntries = scoreEntries.filter(e => !e.key.startsWith('G'));

  const matchPrefix = (key: string, prefix: string | string[]) => {
    if (Array.isArray(prefix)) return prefix.some(p => key.startsWith(p));
    return key.startsWith(prefix);
  };

  const isOverallKey = (key: string, overallKey: string | string[]) => {
    if (Array.isArray(overallKey)) return overallKey.some(ok => key === ok);
    return key === overallKey;
  };

  // Score color helper
  const getScoreColor = (val: number) => {
    if (val >= 4.0) return '#16a34a';
    if (val >= 3.0) return '#2563eb';
    if (val >= 2.0) return '#d97706';
    return '#dc2626';
  };

  const pillarsData = [
    { id: 1, title: 'ด้านผู้เรียน', subtitle: 'Student Quality', prefix: 'S', overallFallback: pillar.learner, overallKey: 'S', color: '#3b82f6', bg: '#eff6ff' },
    { id: 2, title: 'ด้านการมีส่วนร่วม', subtitle: 'Stakeholder Participation', prefix: 'M', overallFallback: pillar.participation, overallKey: 'M', color: '#10b981', bg: '#ecfdf5' },
    { id: 3, title: 'ด้านผู้สอนและผู้บริหาร', subtitle: 'Teacher & Management', prefix: 'H', overallFallback: pillar.teacherAdmin, overallKey: 'H', color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 4, title: 'ด้านหลักสูตรและการสอน', subtitle: 'Curriculum & Instruction', prefix: ['C', 'E'], overallFallback: pillar.curriculum, overallKey: ['C', 'E'], color: '#f59e0b', bg: '#fffbeb' },
    { id: 5, title: 'ด้านโครงสร้างพื้นฐาน', subtitle: 'Infrastructure', prefix: 'D', overallFallback: pillar.infrastructure, overallKey: 'D', color: '#ef4444', bg: '#fef2f2' },
  ];

  // Overall average
  const pillarScoresList = [pillar.learner, pillar.participation, pillar.teacherAdmin, pillar.curriculum, pillar.infrastructure];
  const avgScore = pillarScoresList.reduce((a, b) => a + b, 0) / 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Overall Summary Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {pillarsData.map((pil) => {
          const overallEntry = cleanEntries.find(e => isOverallKey(e.key, pil.overallKey));
          const score = overallEntry ? overallEntry.val : pil.overallFallback;
          return (
            <div key={pil.id} style={{
              background: '#ffffff',
              border: `1px solid ${pil.color}30`,
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              borderTop: `3px solid ${pil.color}`,
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: getScoreColor(score), lineHeight: 1.1 }}>
                {score.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>/ 5.00</div>
              <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginTop: '6px' }}>{pil.title}</div>
            </div>
          );
        })}
        {/* Average card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px',
          textAlign: 'center',
          borderTop: '3px solid #16a34a',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ค่าเฉลี่ยรวม
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1, color: '#16a34a' }}>
            {avgScore.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>/ 5.00</div>
          <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginTop: '6px' }}>Overall Average</div>
        </div>
      </div>

      {/* Each Pillar Table Section */}
      {pillarsData.map((pil) => {
        const overallEntry = cleanEntries.find(e => isOverallKey(e.key, pil.overallKey));
        const overallScore = overallEntry ? overallEntry.val : pil.overallFallback;

        const subs = cleanEntries
          .filter(e => matchPrefix(e.key, pil.prefix) && !isOverallKey(e.key, pil.overallKey))
          .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

        return (
          <div key={pil.id} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
            {/* Colored header bar */}
            <div style={{
              background: pil.color,
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                  {pil.title}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                  ({pil.subtitle})
                </span>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '4px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}>
                {overallScore.toFixed(2)} / 5.00
              </div>
            </div>

            {/* Stacked Indicator List (2-Line layout) */}
            {subs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {subs.map((sub, idx) => {
                  const pct = (sub.val / 5) * 100;
                  return (
                    <div
                      key={sub.key}
                      style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Line 1: Label and Score Value */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          color: '#334155',
                          lineHeight: '1.4',
                        }}>
                          {lookups[sub.key] || (
                            <span style={{ color: pil.color, fontWeight: 700 }}>{sub.key}</span>
                          )}
                        </span>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: getScoreColor(sub.val),
                          whiteSpace: 'nowrap',
                        }}>
                          {sub.val.toFixed(2)}
                        </span>
                      </div>

                      {/* Line 2: Progress Bar */}
                      <div style={{
                        width: '100%',
                        height: '12px',
                        background: '#e2e8f0',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${pil.color}cc, ${pil.color})`,
                          borderRadius: '6px',
                          transition: 'width 0.6s ease-out',
                          minWidth: pct > 0 ? '12px' : '0',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                ไม่พบข้อมูลตัวชี้วัดย่อยของเสาหลักนี้
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Helpers & Sub-components */
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

function SpiderChart({ scores }: { scores: SchoolFull['pillarScores'] }) {
  const center = 160;
  const maxVal = 5; // Full scale of 5
  const radius = 80;
  const labelRadius = 110;

  const pillarLabels = [
    'ผู้เรียน (G01)',
    'การมีส่วนร่วม (G02)',
    'ครู/ผู้บริหาร (G03)',
    'หลักสูตร (G04)',
    'โครงสร้างฯ (G05)',
  ];

  const pillarValues = [
    scores.learner ?? 0,
    scores.participation ?? 0,
    scores.teacherAdmin ?? 0,
    scores.curriculum ?? 0,
    scores.infrastructure ?? 0,
  ];

  const getCoordinates = (index: number, value: number, rCustom?: number) => {
    const angle = (Math.PI * 2 / 5) * index - Math.PI / 2;
    const r = rCustom !== undefined ? rCustom : (value / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const levels = [1, 2, 3, 4, 5];
  const gridPolygons = levels.map(level => {
    return Array.from({ length: 5 }).map((_, idx) => {
      const { x, y } = getCoordinates(idx, level);
      return `${x},${y}`;
    }).join(' ');
  });

  const scorePoints = pillarValues.map((val, idx) => getCoordinates(idx, val));
  const scorePath = scorePoints.map(p => `${p.x},${p.y}`).join(' ');

  const pointColors = ['#1d3d6f', '#ca8a04', '#ec4899', '#8b5cf6', '#0d9488'];

  return (
    <div className="spider-chart-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <svg className="spider-chart-svg" viewBox="0 0 320 320" style={{ maxWidth: '340px', width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Polygon Grid Lines */}
        {gridPolygons.map((points, idx) => (
          <polygon key={idx} points={points} className="spider-chart__grid-line" style={{ stroke: '#e2e8f0', strokeWidth: 1, fill: 'none' }} />
        ))}

        {/* Radial Axis Lines */}
        {Array.from({ length: 5 }).map((_, idx) => {
          const outer = getCoordinates(idx, 5);
          return <line key={idx} x1={center} y1={center} x2={outer.x} y2={outer.y} className="spider-chart__axis" style={{ stroke: '#cbd5e1', strokeWidth: 1 }} />;
        })}

        {/* Score Area Polygon */}
        <polygon points={scorePath} className="spider-chart__area" style={{ fill: 'rgba(29, 61, 111, 0.15)', stroke: '#1d3d6f', strokeWidth: 2.5 }} />

        {/* Data Points and Value Badges */}
        {scorePoints.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={5} style={{ fill: pointColors[idx % pointColors.length], stroke: '#ffffff', strokeWidth: 1.5 }} />
          </g>
        ))}

        {/* Axis Labels Around Chart */}
        {pillarLabels.map((lbl, idx) => {
          const labelPos = getCoordinates(idx, 5, labelRadius);
          const scoreVal = pillarValues[idx];
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (labelPos.x < center - 10) textAnchor = 'end';
          if (labelPos.x > center + 10) textAnchor = 'start';

          return (
            <text
              key={idx}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              style={{ fontSize: '11px', fontWeight: 600, fill: '#334155' }}
            >
              {lbl} ({scoreVal.toFixed(1)})
            </text>
          );
        })}
      </svg>
    </div>
  );
}