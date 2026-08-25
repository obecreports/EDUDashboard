import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Users,
  GraduationCap,
  ChevronRight,
  RotateCcw,
  School,
} from 'lucide-react';
import { getAllSchoolsFull } from '../data/mockSchools';
import type { SchoolFull, SchoolSize, QualityLevel } from '../types/school';

export default function SchoolList() {
  const allSchools = getAllSchoolsFull();

  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterOrganize, setFilterOrganize] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 9;

  // Unique filter options
  const provinces = useMemo(
    () => [...new Set(allSchools.map(s => s.province))].sort(),
    [allSchools]
  );

  const organizeDomains = useMemo(
    () => [...new Set(allSchools.map(s => s.organize_domain))].sort(),
    [allSchools]
  );

  // Filter logic
  const filtered = useMemo(() => {
    return allSchools.filter(s => {
      const matchSearch =
        !search ||
        s.school_name_th.includes(search) ||
        s.school_name_en.toLowerCase().includes(search.toLowerCase()) ||
        s.school_id.includes(search);
      const matchProvince = !filterProvince || s.province === filterProvince;
      const matchOrganize = !filterOrganize || s.organize_domain === filterOrganize;
      const matchSize = !filterSize || s.school_size === filterSize;
      const matchQuality = !filterQuality || s.assessment.quality_level === filterQuality;
      return matchSearch && matchProvince && matchOrganize && matchSize && matchQuality;
    });
  }, [allSchools, search, filterProvince, filterOrganize, filterSize, filterQuality]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const clearFilters = () => {
    setSearch('');
    setFilterProvince('');
    setFilterOrganize('');
    setFilterSize('');
    setFilterQuality('');
    setCurrentPage(1);
  };

  const qualityBadgeClass = (level: QualityLevel): string => {
    return `school-card__badge badge--${level.toLowerCase()}`;
  };

  const sizeBadgeLabel = (size: SchoolSize): string => {
    return `ขนาด${size}`;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">รายชื่อโรงเรียน</h1>
        <p className="page-header__subtitle">
          โรงเรียนในสังกัดทั้งหมด {allSchools.length} แห่ง • ปีการศึกษา 2567
        </p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-bar__group" style={{ flex: 2 }}>
          <label className="filter-bar__label">ค้นหาโรงเรียน</label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="filter-bar__input"
              placeholder="ชื่อโรงเรียน, รหัส..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>
        </div>

        <div className="filter-bar__group">
          <label className="filter-bar__label">จังหวัด</label>
          <select
            className="filter-bar__select"
            value={filterProvince}
            onChange={e => { setFilterProvince(e.target.value); setCurrentPage(1); }}
          >
            <option value="">ทุกจังหวัด</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="filter-bar__group">
          <label className="filter-bar__label">สังกัด/เขตพื้นที่</label>
          <select
            className="filter-bar__select"
            value={filterOrganize}
            onChange={e => { setFilterOrganize(e.target.value); setCurrentPage(1); }}
          >
            <option value="">ทุกสังกัด</option>
            {organizeDomains.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="filter-bar__group">
          <label className="filter-bar__label">ขนาด</label>
          <select
            className="filter-bar__select"
            value={filterSize}
            onChange={e => { setFilterSize(e.target.value); setCurrentPage(1); }}
          >
            <option value="">ทุกขนาด</option>
            <option value="เล็ก">เล็ก</option>
            <option value="กลาง">กลาง</option>
            <option value="ใหญ่">ใหญ่</option>
            <option value="ใหญ่พิเศษ">ใหญ่พิเศษ</option>
          </select>
        </div>

        <div className="filter-bar__group">
          <label className="filter-bar__label">ระดับคุณภาพ</label>
          <select
            className="filter-bar__select"
            value={filterQuality}
            onChange={e => { setFilterQuality(e.target.value); setCurrentPage(1); }}
          >
            <option value="">ทุกระดับ</option>
            <option value="Excellent">Excellent</option>
            <option value="Great">Great</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Developing">Developing</option>
          </select>
        </div>

        <button className="filter-bar__btn filter-bar__btn--outline" onClick={clearFilters}>
          <RotateCcw size={14} /> ล้าง
        </button>
      </div>

      {/* Results count */}
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        แสดงผล {filtered.length} โรงเรียน
        {search || filterProvince || filterOrganize || filterSize || filterQuality ? ' (กรองแล้ว)' : ''}
      </p>

      {/* School Cards Grid */}
      <div className="school-grid">
        {paginated.map((school: SchoolFull) => (
          <Link
            to={`/schools/${school.school_id}`}
            key={school.school_id}
            className="school-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="school-card__header">
              <div className="school-card__name">{school.school_name_th}</div>
              <div className="school-card__name-en">{school.school_name_en}</div>
            </div>
            <div className="school-card__body">
              <div className="school-card__info">
                <div className="school-card__info-row">
                  <MapPin className="school-card__info-icon" size={16} />
                  {school.subdistrict}, {school.district}, {school.province}
                </div>
                <div className="school-card__info-row">
                  <School className="school-card__info-icon" size={16} />
                  {school.organize_domain}
                </div>
              </div>
              <div className="school-card__stats">
                <div className="school-card__stat">
                  <div className="school-card__stat-value">
                    <Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--green-500)' }} />
                    {school.studentSummary.totalStudents}
                  </div>
                  <div className="school-card__stat-label">นักเรียน</div>
                </div>
                <div className="school-card__stat">
                  <div className="school-card__stat-value">
                    <GraduationCap size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--green-500)' }} />
                    {school.personnelSummary.totalPersonnel}
                  </div>
                  <div className="school-card__stat-label">บุคลากร</div>
                </div>
                <div className="school-card__stat">
                  <div className="school-card__stat-value font-en" style={{ fontSize: '0.85rem' }}>
                    {school.studentSummary.totalClassrooms}
                  </div>
                  <div className="school-card__stat-label">ห้องเรียน</div>
                </div>
              </div>
            </div>
            <div className="school-card__footer">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={qualityBadgeClass(school.assessment.quality_level)}>
                  {school.assessment.quality_level}
                </span>
                <span className="school-card__badge badge--size">
                  {sizeBadgeLabel(school.school_size)}
                </span>
              </div>
              <ChevronRight size={18} className="school-card__arrow" />
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
        }}>
          <School size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>ไม่พบโรงเรียนที่ตรงกับเงื่อนไข</p>
          <p style={{ fontSize: '0.85rem' }}>ลองปรับตัวกรองใหม่</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`pagination__btn ${p === currentPage ? 'pagination__btn--active' : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="pagination__btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
