import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Users,
  GraduationCap,
  ChevronRight,
  RotateCcw,
  School as SchoolIcon,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { fetchSchools } from '../services/supabase';
import type { SchoolFull, SchoolSize } from '../types/school';

export default function SchoolList() {
  const [allSchools, setAllSchools] = useState<SchoolFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [showAutoSuggest, setShowAutoSuggest] = useState(false);

  // Province Combobox State
  const [filterProvince, setFilterProvince] = useState('');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvinceCombobox, setShowProvinceCombobox] = useState(false);

  // Area / Organization Combobox State
  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterAreaName, setFilterAreaName] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaCombobox, setShowAreaCombobox] = useState(false);

  // School Size Dropdown State
  const [filterSize, setFilterSize] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 9;

  const suggestRef = useRef<HTMLDivElement>(null);
  const provinceRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSchools();
        setAllSchools(data);
      } catch (e: any) {
        console.error('Failed to load schools from Supabase:', e);
        setErrorMsg(e?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close comboboxes and auto-suggest when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(event.target as Node)) {
        setShowAutoSuggest(false);
      }
      if (provinceRef.current && !provinceRef.current.contains(event.target as Node)) {
        setShowProvinceCombobox(false);
      }
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setShowAreaCombobox(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique provinces for combobox
  const provinces = useMemo(() => {
    const set = new Set<string>();
    allSchools.forEach((s) => {
      if (s.province) set.add(s.province.trim());
    });
    return Array.from(set).sort();
  }, [allSchools]);

  // Filtered provinces list for combobox search input
  const filteredProvinces = useMemo(() => {
    if (!provinceSearch.trim()) return provinces;
    const term = provinceSearch.toLowerCase().trim();
    return provinces.filter((p) => p.toLowerCase().includes(term));
  }, [provinces, provinceSearch]);

  // Extract unique Area ID & Area Name mapping for "สังกัด/เขตพื้นที่" combobox
  const areaOptions = useMemo(() => {
    const map = new Map<string, string>(); // area_id -> area_name
    allSchools.forEach((s: any) => {
      const areaId = s.area_id !== undefined && s.area_id !== null ? String(s.area_id) : '';
      const areaName = s.area_name || s.Gov_Domain?.area_name || s.organize_domain || (areaId ? `เขตพื้นที่ ${areaId}` : '');

      if (areaId && areaName) {
        map.set(areaId, areaName);
      } else if (areaName) {
        map.set(areaName, areaName);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [allSchools]);

  // Filtered area options for combobox search input
  const filteredAreaOptions = useMemo(() => {
    if (!areaSearch.trim()) return areaOptions;
    const term = areaSearch.toLowerCase().trim();
    return areaOptions.filter(
      (opt) => opt.name.toLowerCase().includes(term) || opt.id.toLowerCase().includes(term)
    );
  }, [areaOptions, areaSearch]);

  // Auto-suggest items matching school name / ID search term
  const autoSuggestList = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase().trim();
    return allSchools
      .filter(
        (s) =>
          s.school_name_th.toLowerCase().includes(term) ||
          (s.school_name_en && s.school_name_en.toLowerCase().includes(term)) ||
          String(s.school_id).includes(term)
      )
      .slice(0, 6);
  }, [allSchools, search]);

  // Main Filter Logic
  const filtered = useMemo(() => {
    return allSchools.filter((s: any) => {
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        s.school_name_th.toLowerCase().includes(term) ||
        (s.school_name_en && s.school_name_en.toLowerCase().includes(term)) ||
        String(s.school_id).includes(term);

      const matchProvince = !filterProvince || s.province === filterProvince;

      const sAreaId = s.area_id !== undefined && s.area_id !== null ? String(s.area_id) : '';
      const sAreaName = s.area_name || s.Gov_Domain?.area_name || s.organize_domain || '';
      const matchArea = !filterAreaId || sAreaId === filterAreaId || sAreaName === filterAreaId;

      const matchSize = !filterSize || s.school_size === filterSize;

      return matchSearch && matchProvince && matchArea && matchSize;
    });
  }, [allSchools, search, filterProvince, filterAreaId, filterSize]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const clearFilters = () => {
    setSearch('');
    setFilterProvince('');
    setProvinceSearch('');
    setFilterAreaId('');
    setFilterAreaName('');
    setAreaSearch('');
    setFilterSize('');
    setCurrentPage(1);
  };

  const sizeBadgeLabel = (size: SchoolSize): string => {
    return `ขนาด${size || 'ทั่วไป'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3 text-sky-800">
          <div className="w-10 h-10 border-4 border-sky-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-sm">กำลังดึงข้อมูลจาก Supabase …</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          เกิดข้อผิดพลาดในการโหลดข้อมูล: {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 pb-16">
      {/* Header Banner - Matching Dashboard Theme */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-sky-700 text-white px-6 py-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-sky-200 font-semibold mb-1">
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">รายชื่อโรงเรียน</h1>
            <p className="text-sm text-sky-100 mt-1">
              ค้นหาและเรียกดูข้อมูลโรงเรียนทั้งหมดในระบบ ({allSchools.length.toLocaleString()} โรงเรียน)
            </p>
          </div>
          <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 text-right">
            <span className="text-xs text-sky-100 block">ผลการค้นหา</span>
            <span className="text-2xl font-bold text-white">{filtered.length.toLocaleString()}</span>
            <span className="text-xs text-sky-200"> แห่ง</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Filter Section Card - Border Only Theme */}
        <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Filter 1: Auto-suggest School Name / ID Search */}
            <div className="relative" ref={suggestRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                ค้นหาโรงเรียน (ชื่อ หรือ รหัสโรงเรียน)
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-gray-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="พิมพ์ชื่อโรงเรียน หรือ รหัส..."
                  value={search}
                  onFocus={() => setShowAutoSuggest(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowAutoSuggest(true);
                    setCurrentPage(1);
                  }}
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setShowAutoSuggest(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Auto-suggest dropdown modal */}
              {showAutoSuggest && autoSuggestList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden divide-y divide-gray-100">
                  {autoSuggestList.map((item) => (
                    <div
                      key={item.school_id}
                      className="p-2.5 hover:bg-sky-50 cursor-pointer transition text-left"
                      onClick={() => {
                        setSearch(item.school_name_th);
                        setShowAutoSuggest(false);
                        setCurrentPage(1);
                      }}
                    >
                      <div className="text-sm font-semibold text-sky-900 flex justify-between">
                        <span>{item.school_name_th}</span>
                        <span className="text-xs font-mono text-gray-400">ID: {item.school_id}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.district}, {item.province}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter 2: Province Searchable Combobox */}
            <div className="relative" ref={provinceRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                จังหวัด
              </label>
              <div
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-gray-300 rounded-md focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500 flex items-center justify-between cursor-pointer"
                onClick={() => setShowProvinceCombobox(!showProvinceCombobox)}
              >
                <span className={`truncate ${filterProvince ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {filterProvince || '-- ทุกจังหวัด --'}
                </span>
                <div className="flex items-center space-x-1 ml-1 text-gray-400">
                  {filterProvince && (
                    <X
                      size={14}
                      className="hover:text-gray-600 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterProvince('');
                        setProvinceSearch('');
                        setCurrentPage(1);
                      }}
                    />
                  )}
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* Province Combobox Modal */}
              {showProvinceCombobox && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 bg-slate-50">
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder="พิมพ์เพื่อกรองชื่อจังหวัด..."
                      value={provinceSearch}
                      onChange={(e) => setProvinceSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 text-xs">
                    <div
                      className={`p-2.5 hover:bg-sky-50 cursor-pointer flex justify-between items-center ${!filterProvince ? 'bg-sky-50 font-bold text-sky-800' : 'text-gray-700'
                        }`}
                      onClick={() => {
                        setFilterProvince('');
                        setShowProvinceCombobox(false);
                        setCurrentPage(1);
                      }}
                    >
                      <span>-- ทุกจังหวัด --</span>
                      {!filterProvince && <Check size={14} className="text-sky-700" />}
                    </div>
                    {filteredProvinces.map((p) => {
                      const isSelected = filterProvince === p;
                      return (
                        <div
                          key={p}
                          className={`p-2.5 hover:bg-sky-50 cursor-pointer flex justify-between items-center ${isSelected ? 'bg-sky-50 font-bold text-sky-800' : 'text-gray-700'
                            }`}
                          onClick={() => {
                            setFilterProvince(p);
                            setShowProvinceCombobox(false);
                            setCurrentPage(1);
                          }}
                        >
                          <span>{p}</span>
                          {isSelected && <Check size={14} className="text-sky-700" />}
                        </div>
                      );
                    })}

                    {filteredProvinces.length === 0 && (
                      <div className="p-3 text-center text-gray-400 italic">ไม่พบจังหวัดที่ค้นหา</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter 3: สังกัด/เขตพื้นที่ (Gov_Domain) Searchable Combobox */}
            <div className="relative" ref={areaRef}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                สังกัด/เขตพื้นที่
              </label>
              <div
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-gray-300 rounded-md focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500 flex items-center justify-between cursor-pointer"
                onClick={() => setShowAreaCombobox(!showAreaCombobox)}
              >
                <span className={`truncate ${filterAreaName ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {filterAreaName || '-- ทุกสังกัด/เขตพื้นที่ --'}
                </span>
                <div className="flex items-center space-x-1 ml-1 text-gray-400">
                  {filterAreaId && (
                    <X
                      size={14}
                      className="hover:text-gray-600 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterAreaId('');
                        setFilterAreaName('');
                        setAreaSearch('');
                        setCurrentPage(1);
                      }}
                    />
                  )}
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* Area Combobox Modal */}
              {showAreaCombobox && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 bg-slate-50">
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                      placeholder="พิมพ์เพื่อกรองเขตพื้นที่..."
                      value={areaSearch}
                      onChange={(e) => setAreaSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 text-xs">
                    <div
                      className={`p-2.5 hover:bg-sky-50 cursor-pointer flex justify-between items-center ${!filterAreaId ? 'bg-sky-50 font-bold text-sky-800' : 'text-gray-700'
                        }`}
                      onClick={() => {
                        setFilterAreaId('');
                        setFilterAreaName('');
                        setShowAreaCombobox(false);
                        setCurrentPage(1);
                      }}
                    >
                      <span>-- ทุกสังกัด/เขตพื้นที่ --</span>
                      {!filterAreaId && <Check size={14} className="text-sky-700" />}
                    </div>
                    {filteredAreaOptions.map((opt) => {
                      const isSelected = filterAreaId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 hover:bg-sky-50 cursor-pointer flex justify-between items-center ${isSelected ? 'bg-sky-50 font-bold text-sky-800' : 'text-gray-700'
                            }`}
                          onClick={() => {
                            setFilterAreaId(opt.id);
                            setFilterAreaName(opt.name);
                            setShowAreaCombobox(false);
                            setCurrentPage(1);
                          }}
                        >
                          <span className="truncate">{opt.name}</span>
                          {isSelected && <Check size={14} className="text-sky-700 shrink-0 ml-1" />}
                        </div>
                      );
                    })}

                    {filteredAreaOptions.length === 0 && (
                      <div className="p-3 text-center text-gray-400 italic">ไม่พบเขตพื้นที่ที่ค้นหา</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter 4: School Size Dropdown (< 8 choices) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                ขนาดโรงเรียน
              </label>
              <select
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-gray-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                value={filterSize}
                onChange={(e) => {
                  setFilterSize(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">-- ทุกขนาด --</option>
                <option value="เล็ก">เล็ก</option>
                <option value="กลาง">กลาง</option>
                <option value="ใหญ่">ใหญ่</option>
                <option value="ใหญ่พิเศษ">ใหญ่พิเศษ</option>
              </select>
            </div>
          </div>

          {/* Reset Filters & Summary Line */}
          <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              พบข้อมูลที่ตรงตามเงื่อนไข <strong className="text-sky-800">{filtered.length}</strong> แห่ง
              {(search || filterProvince || filterAreaId || filterSize) && ' (กำลังใช้งานตัวกรอง)'}
            </span>

            {(search || filterProvince || filterAreaId || filterSize) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center space-x-1 text-sky-700 hover:text-sky-900 font-medium transition"
              >
                <RotateCcw size={13} />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {/* School Cards Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginated.map((school: any) => (
            <Link
              to={`/schools/${school.school_id}`}
              key={school.school_id}
              className="group bg-white border border-gray-200 hover:border-sky-500 rounded-lg p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <span className="text-[11px] font-mono font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 inline-block mb-1">
                      ID: {school.school_id}
                    </span>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-sky-700 transition-colors line-clamp-1">
                      {school.school_name_th}
                    </h3>
                    {school.school_name_en && (
                      <p className="text-xs text-gray-400 line-clamp-1">{school.school_name_en}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-sky-100 text-sky-800 rounded-full shrink-0">
                    {sizeBadgeLabel(school.school_size)}
                  </span>
                </div>

                {/* Location & Organization */}
                <div className="space-y-1.5 text-xs text-gray-600 mb-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center text-gray-600">
                    <MapPin size={14} className="mr-1.5 text-sky-600 shrink-0" />
                    <span className="truncate">
                      {[school.subdistrict, school.district, school.province].filter(Boolean).join(', ') || 'ไม่ระบุที่อยู่'}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <SchoolIcon size={14} className="mr-1.5 text-sky-600 shrink-0" />
                    <span className="truncate">
                      {school.area_name || school.Gov_Domain?.area_name || school.organize_domain || 'ไม่ระบุสังกัด'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="border-t border-gray-100 pt-3 mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">นักเรียน</span>
                    <div className="font-bold text-gray-800 flex items-center">
                      <Users size={12} className="mr-1 text-sky-600" />
                      {school.studentSummary?.totalStudents?.toLocaleString() ?? 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">บุคลากร</span>
                    <div className="font-bold text-gray-800 flex items-center">
                      <GraduationCap size={12} className="mr-1 text-emerald-600" />
                      {school.personnelSummary?.totalPersonnel?.toLocaleString() ?? 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-sky-600 font-medium text-xs group-hover:translate-x-1 transition-transform">
                  <span>ดูรายละเอียด</span>
                  <ChevronRight size={16} className="ml-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
            <SchoolIcon size={48} className="mx-auto mb-3 text-gray-300" />
            <h4 className="text-lg font-bold text-gray-700">ไม่พบโรงเรียนที่ตรงกับเงื่อนไข</h4>
            <p className="text-xs text-gray-400 mt-1">โปรดลองปรับเปลี่ยนคำค้นหา หรือ ล้างตัวกรอง</p>
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-md hover:bg-sky-700 transition"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-1.5 pt-6">
            {/* First Page */}
            <button
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="หน้าแรก"
            >
              « หน้าแรก
            </button>

            {/* Previous Page */}
            <button
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="ย้อนกลับ"
            >
              ‹ ย้อนกลับ
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`w-8 h-8 rounded text-xs font-bold transition ${p === currentPage
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}

            {/* Next Page */}
            <button
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="ถัดไป"
            >
              ถัดไป ›
            </button>

            {/* Last Page */}
            <button
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="หน้าสุดท้าย"
            >
              หน้าสุดท้าย »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}