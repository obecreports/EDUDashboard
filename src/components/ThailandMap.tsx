import React, { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3-geo';
import type { SchoolFull } from '../types/school';

interface ThailandMapProps {
  schools: SchoolFull[];
}

interface GeoFeature {
  type: string;
  properties: {
    NAME_0?: string;
    NAME_1?: string; // English province name e.g. "Chiang Mai"
    [key: string]: any;
  };
  geometry: any;
}

const THAI_PROVINCE_NAMES: { [enName: string]: string } = {
  'Amnat Charoen': 'อำนาจเจริญ',
  'Ang Thong': 'อ่างทอง',
  'Bangkok Metropolis': 'กรุงเทพมหานคร',
  'Bangkok': 'กรุงเทพมหานคร',
  'Buogkan': 'บึงกาฬ',
  'Buri Ram': 'บุรีรัมย์',
  'Chachoengsao': 'ฉะเชิงเทรา',
  'Chai Nat': 'ชัยนาท',
  'Chaiyaphum': 'ชัยภูมิ',
  'Chanthaburi': 'จันทบุรี',
  'Chiang Mai': 'เชียงใหม่',
  'Chiang Rai': 'เชียงราย',
  'Chon Buri': 'ชลบุรี',
  'Chumphon': 'ชุมพร',
  'Kalasin': 'กาฬสินธุ์',
  'Kamphaeng Phet': 'กำแพงเพชร',
  'Kanchanaburi': 'กาญจนบุรี',
  'Khon Kaen': 'ขอนแก่น',
  'Krabi': 'กระบี่',
  'Lampang': 'ลำปาง',
  'Lamphun': 'ลำพูน',
  'Loei': 'เลย',
  'Lop Buri': 'ลพบุรี',
  'Mae Hong Son': 'แม่ฮ่องสอน',
  'Maha Sarakham': 'มหาสารคาม',
  'Mukdahan': 'มุกดาหาร',
  'Nakhon Nayok': 'นครนายก',
  'Nakhon Pathom': 'นครปฐม',
  'Nakhon Phanom': 'นครพนม',
  'Nakhon Ratchasima': 'นครราชสีมา',
  'Nakhon Sawan': 'นครสวรรค์',
  'Nakhon Si Thammarat': 'นครศรีธรรมราช',
  'Nan': 'น่าน',
  'Narathiwat': 'นราธิวาส',
  'Nong Bua Lam Phu': 'หนองบัวลำภู',
  'Nong Khai': 'หนองคาย',
  'Nonthaburi': 'นนทบุรี',
  'Pathum Thani': 'ปทุมธานี',
  'Pattani': 'ปัตตานี',
  'Phangnga': 'พังงา',
  'Phatthalung': 'พัทลุง',
  'Phayao': 'พะเยา',
  'Phetchabun': 'เพชรบูรณ์',
  'Phetchaburi': 'เพชรบุรี',
  'Phichit': 'พิจิตร',
  'Phitsanulok': 'พิษณุโลก',
  'Phra Nakhon Si Ayutthaya': 'พระนครศรีอยุธยา',
  'Phrae': 'แพร่',
  'Phuket': 'ภูเก็ต',
  'Prachin Buri': 'ปราจีนบุรี',
  'Prachuap Khiri Khan': 'ประจวบคีรีขันธ์',
  'Ranong': 'ระนอง',
  'Ratchaburi': 'ราชบุรี',
  'Rayong': 'ระยอง',
  'Roi Et': 'ร้อยเอ็ด',
  'Sa Kaeo': 'สระแก้ว',
  'Sakon Nakhon': 'สกลนคร',
  'Samut Prakan': 'สมุทรปราการ',
  'Samut Sakhon': 'สมุทรสาคร',
  'Samut Songkhram': 'สมุทรสงคราม',
  'Saraburi': 'สระบุรี',
  'Satun': 'สตูล',
  'Sing Buri': 'สิงห์บุรี',
  'Si Sa Ket': 'ศรีสะเกษ',
  'Songkhla': 'สงขลา',
  'Sukhothai': 'สุโขทัย',
  'Suphan Buri': 'สุพรรณบุรี',
  'Surat Thani': 'สุราษฎร์ธานี',
  'Surin': 'สุรินทร์',
  'Tak': 'ตาก',
  'Trang': 'ตรัง',
  'Trat': 'ตราด',
  'Ubon Ratchathani': 'อุบลราชธานี',
  'Udon Thani': 'อุดรธานี',
  'Uthai Thani': 'อุทัยธานี',
  'Uttaradit': 'อุตรดิตถ์',
  'Yala': 'ยะลา',
  'Yasothon': 'ยโสธร',
};

const GEOJSON_URL = 'https://raw.githubusercontent.com/cvibhagool/thailand-map/master/thailand-provinces.geojson';

export interface AreaSchoolItem {
  school_id: string;
  school_name_th: string;
  students: number;
  personnel: number;
}

export interface AreaGroup {
  areaId: string;
  areaName: string;
  schools: AreaSchoolItem[];
  totalStudents: number;
  totalPersonnel: number;
}

export const ThailandMap: React.FC<ThailandMapProps> = ({ schools }) => {
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'district' | 'area'>('district');

  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [hoveredAreaKey, setHoveredAreaKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.features) {
          setGeoFeatures(data.features);
        }
      })
      .catch((err) => console.error('Failed to load Thailand GeoJSON:', err))
      .finally(() => setLoading(false));
  }, []);

  // Pre-calculate province, district, & educational area breakdown statistics using useMemo
  const { provinceStatsMap, districtStatsMap, areaStatsMap } = useMemo(() => {
    const provMap = new Map<string, { schools: number; students: number; personnel: number; areasCount: number }>();
    const provAreaSets = new Map<string, Set<string>>();
    const distMap = new Map<string, Map<string, { schools: number; students: number; personnel: number }>>();
    const areaMap = new Map<string, Map<string, AreaGroup>>();

    schools.forEach((s) => {
      const provName = s.province?.trim() || 'ไม่ระบุ';
      const distName = s.district?.trim() || 'ไม่ระบุ';

      const areaId = s.area_id !== undefined && s.area_id !== null && s.area_id !== '' ? String(s.area_id) : '';
      const areaName = s.area_name || s.Gov_Domain?.area_name || s.organize_domain || (areaId ? `เขตพื้นที่ ${areaId}` : 'ไม่ระบุเขตพื้นที่');
      const areaKey = areaId || areaName;

      // Track unique areas per province
      if (!provAreaSets.has(provName)) {
        provAreaSets.set(provName, new Set());
      }
      if (areaKey && areaKey !== 'ไม่ระบุเขตพื้นที่') {
        provAreaSets.get(provName)!.add(areaKey);
      }

      const students = s.studentSummary?.totalStudents ?? 0;
      const personnel = s.personnelSummary?.totalPersonnel ?? 0;

      // Province stats
      const pCurrent = provMap.get(provName) || { schools: 0, students: 0, personnel: 0, areasCount: 0 };
      pCurrent.schools += 1;
      pCurrent.students += students;
      pCurrent.personnel += personnel;
      provMap.set(provName, pCurrent);

      // District stats per province
      if (!distMap.has(provName)) {
        distMap.set(provName, new Map());
      }
      const dSubMap = distMap.get(provName)!;
      const dCurrent = dSubMap.get(distName) || { schools: 0, students: 0, personnel: 0 };
      dCurrent.schools += 1;
      dCurrent.students += students;
      dCurrent.personnel += personnel;
      dSubMap.set(distName, dCurrent);

      // Area stats per province
      if (!areaMap.has(provName)) {
        areaMap.set(provName, new Map());
      }
      const aSubMap = areaMap.get(provName)!;
      if (!aSubMap.has(areaKey)) {
        aSubMap.set(areaKey, {
          areaId,
          areaName,
          schools: [],
          totalStudents: 0,
          totalPersonnel: 0,
        });
      }
      const aGroup = aSubMap.get(areaKey)!;
      aGroup.totalStudents += students;
      aGroup.totalPersonnel += personnel;
      aGroup.schools.push({
        school_id: s.school_id,
        school_name_th: s.school_name_th || s.school_name_en || 'ไม่ระบุชื่อโรงเรียน',
        students,
        personnel,
      });
    });

    // Populate areasCount into provMap
    provMap.forEach((val, pName) => {
      val.areasCount = provAreaSets.get(pName)?.size ?? 0;
    });

    return { provinceStatsMap: provMap, districtStatsMap: distMap, areaStatsMap: areaMap };
  }, [schools]);

  // Find selected feature for smooth viewport zooming
  const selectedFeature = useMemo(() => {
    if (!selectedProvince) return null;
    return geoFeatures.find((f) => {
      const enName = f.properties.NAME_1 || '';
      const thName = THAI_PROVINCE_NAMES[enName] || enName;
      return thName === selectedProvince;
    });
  }, [selectedProvince, geoFeatures]);

  const width = 500;
  const height = 800;

  // Memoize map projection & paths to maximize rendering speed
  const { paths, projection } = useMemo(() => {
    const proj = d3.geoMercator();

    if (selectedFeature) {
      // Zoom into selected province bounding box
      proj.fitExtent(
        [
          [40, 40],
          [width - 40, height - 40],
        ],
        selectedFeature as any
      );
    } else {
      // Default view for full Thailand map
      proj
        .center([100.5, 13.8])
        .scale(2600)
        .translate([width / 2, height / 2.2]);
    }

    const generator = d3.geoPath().projection(proj);

    const generatedPaths = geoFeatures.map((feat) => {
      const enName = feat.properties.NAME_1 || '';
      const thName = THAI_PROVINCE_NAMES[enName] || enName;
      const d = generator(feat as any);
      return { thName, enName, d };
    });

    return { paths: generatedPaths, projection: proj };
  }, [geoFeatures, selectedFeature]);

  // Calculate projected school pin locations for the selected province
  const provinceSchoolPins = useMemo(() => {
    if (!selectedProvince || !projection) return [];
    return schools
      .filter((s) => s.province?.trim() === selectedProvince)
      .map((s) => {
        const lat = Number(s.latitude || (s as any).lat);
        const lng = Number(s.longitude || (s as any).lng);
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
        const coords = projection([lng, lat]);
        if (!coords) return null;
        return {
          school: s,
          x: coords[0],
          y: coords[1],
        };
      })
      .filter(Boolean) as Array<{ school: SchoolFull; x: number; y: number }>;
  }, [selectedProvince, schools, projection]);

  // Pin for currently hovered school
  const hoveredPin = useMemo(() => {
    if (!hoveredSchoolId) return null;
    return provinceSchoolPins.find((p) => p.school.school_id === hoveredSchoolId) || null;
  }, [hoveredSchoolId, provinceSchoolPins]);

  // Pins belonging to currently hovered district or area
  const activeGroupPins = useMemo(() => {
    if (!selectedProvince) return [];
    if (hoveredDistrict) {
      return provinceSchoolPins.filter((p) => (p.school.district?.trim() || 'ไม่ระบุ') === hoveredDistrict);
    }
    if (hoveredAreaKey) {
      return provinceSchoolPins.filter((p) => {
        const areaId = p.school.area_id !== undefined && p.school.area_id !== null && p.school.area_id !== '' ? String(p.school.area_id) : '';
        const areaName = p.school.area_name || p.school.Gov_Domain?.area_name || p.school.organize_domain || (areaId ? `เขตพื้นที่ ${areaId}` : 'ไม่ระบุเขตพื้นที่');
        const key = areaId || areaName;
        return key === hoveredAreaKey;
      });
    }
    return [];
  }, [selectedProvince, hoveredDistrict, hoveredAreaKey, provinceSchoolPins]);

  // Compute bounding circle envelope for hovered district or area
  const groupBoundingCircle = useMemo(() => {
    if (activeGroupPins.length === 0) return null;
    const xs = activeGroupPins.map((p) => p.x);
    const ys = activeGroupPins.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const radius = Math.max(Math.hypot(maxX - minX, maxY - minY) / 2 + 18, 24);
    return { cx, cy, radius, label: hoveredDistrict || 'เขตพื้นที่' };
  }, [activeGroupPins, hoveredDistrict]);

  const activeProvince = selectedProvince || hoveredProvince;
  const activeStats = activeProvince ? provinceStatsMap.get(activeProvince) : null;
  const districtsForSelected = selectedProvince ? districtStatsMap.get(selectedProvince) : null;
  const districtList = districtsForSelected ? Array.from(districtsForSelected.entries()) : [];

  const areasForSelected = selectedProvince ? areaStatsMap.get(selectedProvince) : null;
  const areaList = areasForSelected ? Array.from(areasForSelected.entries()) : [];

  return (
    <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-sky-900">แผนที่ประเทศไทย</h3>
          <p className="text-sm text-gray-500 mt-1">
            คลิกเลือกจังหวัดเพื่อแสดงตำแหน่งโรงเรียน ข้อมูลระดับเขต และอำเภอ
          </p>
        </div>
        {selectedProvince && (
          <button
            onClick={() => setSelectedProvince(null)}
            className="mt-2 md:mt-0 flex items-center space-x-1 text-xs px-3 py-1.5 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded font-medium transition"
          >
            <span>← แสดงแผนที่รวมทั้งประเทศ</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Map Container */}
        <div className="lg:col-span-2 flex justify-center bg-slate-50 p-4 border border-gray-100 rounded-lg relative min-h-[500px] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-2 text-sky-700 my-auto">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">กำลังโหลดแผนที่ประเทศไทย…</span>
            </div>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[480px] h-auto drop-shadow-md transition-all duration-500">
              {/* Province Boundaries */}
              {paths.map(({ thName, d }, idx) => {
                const isSelected = selectedProvince === thName;
                const isHovered = hoveredProvince === thName;
                const hasData = provinceStatsMap.has(thName);

                if (!d) return null;

                // Dim non-selected provinces when zoomed into a province
                const isDimmed = selectedProvince && !isSelected;

                return (
                  <path
                    key={idx}
                    d={d}
                    onMouseEnter={() => setHoveredProvince(thName)}
                    onMouseLeave={() => setHoveredProvince(null)}
                    onClick={() => setSelectedProvince(isSelected ? null : thName)}
                    className={`cursor-pointer transition-all duration-300 ${isSelected
                        ? 'fill-sky-600 stroke-sky-900 stroke-2'
                        : isHovered
                          ? 'fill-sky-500 stroke-sky-700 stroke-1.5'
                          : isDimmed
                            ? 'fill-slate-200 stroke-slate-300 opacity-40 hover:opacity-80'
                            : hasData
                              ? 'fill-sky-400 hover:fill-sky-500 stroke-white stroke-[0.5]'
                              : 'fill-slate-300 hover:fill-slate-400 stroke-white stroke-[0.5]'
                      }`}
                  >
                    <title>{thName}</title>
                  </path>
                );
              })}

              {/* District / Area Highlight Envelope Circle */}
              {groupBoundingCircle && (
                <g className="pointer-events-none">
                  <circle
                    cx={groupBoundingCircle.cx}
                    cy={groupBoundingCircle.cy}
                    r={groupBoundingCircle.radius}
                    className="fill-amber-400/20 stroke-amber-500 stroke-2 stroke-dasharray-[5_3] animate-pulse"
                  />
                  <text
                    x={groupBoundingCircle.cx}
                    y={groupBoundingCircle.cy - groupBoundingCircle.radius - 4}
                    textAnchor="middle"
                    className="fill-amber-700 font-bold text-[10px] drop-shadow-sm"
                  >
                    {groupBoundingCircle.label}
                  </text>
                </g>
              )}

              {/* School Pins on Zoomed Province (Option 1 Circle Dots) */}
              {selectedProvince &&
                provinceSchoolPins.map(({ school, x, y }) => {
                  const isSingleHovered = hoveredSchoolId === school.school_id;
                  const isGroupHovered = activeGroupPins.some((gp) => gp.school.school_id === school.school_id);
                  const isHighlighted = isSingleHovered || isGroupHovered;

                  return (
                    <g
                      key={school.school_id}
                      transform={`translate(${x}, ${y})`}
                      onMouseEnter={() => setHoveredSchoolId(school.school_id)}
                      onMouseLeave={() => setHoveredSchoolId(null)}
                      className="cursor-pointer group"
                    >
                      {isHighlighted && (
                        <circle r="11" className="fill-amber-400 opacity-70 animate-ping" />
                      )}
                      <circle
                        r={isHighlighted ? 6.5 : 4.5}
                        className={`transition-all duration-200 ${
                          isHighlighted
                            ? 'fill-amber-400 stroke-slate-900 stroke-2 scale-125'
                            : 'fill-rose-600 stroke-white stroke-[1.5] group-hover:scale-150 group-hover:fill-rose-500'
                        }`}
                      />
                      <title>{school.school_name_th}</title>
                    </g>
                  );
                })}

              {/* Floating Tooltip Directly Above Hovered Pin */}
              {hoveredPin && (
                <g transform={`translate(${hoveredPin.x}, ${hoveredPin.y - 14})`} className="pointer-events-none z-30">
                  <rect
                    x="-95"
                    y="-48"
                    width="190"
                    height="44"
                    rx="6"
                    className="fill-slate-900/95 stroke-amber-400 stroke-[1.5] shadow-2xl"
                  />
                  <polygon points="-6,-4 0,2 6,-4" className="fill-slate-900/95 stroke-amber-400 stroke-[1.5]" />
                  <text x="0" y="-30" textAnchor="middle" className="fill-amber-300 font-bold text-[11px]">
                    {hoveredPin.school.school_name_th.length > 22
                      ? hoveredPin.school.school_name_th.substring(0, 22) + '…'
                      : hoveredPin.school.school_name_th}
                  </text>
                  <text x="0" y="-14" textAnchor="middle" className="fill-slate-300 text-[9.5px]">
                    อำเภอ{hoveredPin.school.district || 'ไม่ระบุ'} • {hoveredPin.school.studentSummary?.totalStudents?.toLocaleString() ?? 0} นักเรียน
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Selected Province / District & Area Detail View */}
        <div className="flex flex-col h-full">
          {activeProvince ? (
            <div className="p-5 border border-sky-200 bg-sky-50/60 rounded-lg space-y-4">
              <div className="border-b border-sky-200 pb-3 flex justify-between items-end">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                    {selectedProvince ? 'จังหวัดที่เลือก (คลิกซูมขยายแล้ว)' : 'จังหวัด'}
                  </span>
                  <h4 className="text-2xl font-extrabold text-sky-900">{activeProvince}</h4>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">โรงเรียน</span>
                  <span className="text-base font-bold text-sky-900">{activeStats?.schools ?? 0} แห่ง</span>
                </div>
                <div className="bg-white p-2 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">เขตพื้นที่</span>
                  <span className="text-base font-bold text-sky-900">{activeStats?.areasCount ?? 0} เขต</span>
                </div>
                <div className="bg-white p-2 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">นักเรียน</span>
                  <span className="text-base font-bold text-sky-900">
                    {activeStats?.students ? activeStats.students.toLocaleString() : 0}
                  </span>
                </div>
                <div className="bg-white p-2 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">บุคลากร</span>
                  <span className="text-base font-bold text-sky-900">
                    {activeStats?.personnel ? activeStats.personnel.toLocaleString() : 0}
                  </span>
                </div>
              </div>

              {/* Switcher & Breakdown Lists */}
              {selectedProvince && (
                <div className="mt-4 pt-3 border-t border-sky-200">
                  {/* Mode Switcher Buttons */}
                  <div className="flex items-center space-x-1 bg-sky-100/80 p-1 rounded-lg mb-3">
                    <button
                      onClick={() => setViewMode('district')}
                      className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                        viewMode === 'district'
                          ? 'bg-white text-sky-900 shadow-sm'
                          : 'text-sky-700 hover:text-sky-900 hover:bg-sky-50'
                      }`}
                    >
                      แบ่งตามอำเภอ ({districtList.length})
                    </button>
                    <button
                      onClick={() => setViewMode('area')}
                      className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                        viewMode === 'area'
                          ? 'bg-white text-sky-900 shadow-sm'
                          : 'text-sky-700 hover:text-sky-900 hover:bg-sky-50'
                      }`}
                    >
                      แบ่งตามเขตพื้นที่ ({areaList.length})
                    </button>
                  </div>

                  {viewMode === 'district' ? (
                    <>
                      <h5 className="text-sm font-bold text-sky-900 mb-2 flex items-center justify-between">
                        <span>แบ่งตามอำเภอ</span>
                        <span className="text-xs font-normal text-sky-700">({districtList.length} อำเภอ)</span>
                      </h5>

                      {districtList.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {districtList.map(([dName, dStats]) => (
                            <div
                              key={dName}
                              onMouseEnter={() => setHoveredDistrict(dName)}
                              onMouseLeave={() => setHoveredDistrict(null)}
                              className={`p-3 border rounded-md flex justify-between items-center text-xs transition-all cursor-pointer ${
                                hoveredDistrict === dName
                                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/60 shadow-sm'
                                  : 'bg-white border-sky-100 hover:border-sky-300 hover:bg-sky-50/50'
                              }`}
                            >
                              <div>
                                <span className="font-semibold text-gray-800 block">{dName}</span>
                                <span className="text-gray-500 text-[10px]">{dStats.schools} โรงเรียน</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-sky-800 block">{dStats.students.toLocaleString()} นักเรียน</span>
                                <span className="text-gray-500 text-[10px]">{dStats.personnel} บุคลากร</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic bg-white p-3 rounded text-center">
                          ไม่มีข้อมูลแบ่งตามอำเภอสำหรับจังหวัดนี้
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h5 className="text-sm font-bold text-sky-900 mb-2 flex items-center justify-between">
                        <span>แบ่งตามเขตพื้นที่การศึกษา</span>
                        <span className="text-xs font-normal text-sky-700">({areaList.length} เขตพื้นที่)</span>
                      </h5>

                      {areaList.length > 0 ? (
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                          {areaList.map(([aKey, aGroup]) => (
                            <div
                              key={aKey}
                              onMouseEnter={() => setHoveredAreaKey(aKey)}
                              onMouseLeave={() => setHoveredAreaKey(null)}
                              className={`p-3 border rounded-md space-y-2 transition-all ${
                                hoveredAreaKey === aKey
                                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/50 shadow-sm'
                                  : 'bg-white border-sky-100'
                              }`}
                            >
                              <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                <div>
                                  <span className="font-bold text-sky-900 text-xs block">{aGroup.areaName}</span>
                                  <span className="text-gray-500 text-[10px]">
                                    {aGroup.schools.length} โรงเรียน
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-sky-800 text-[11px] block">
                                    {aGroup.totalStudents.toLocaleString()} นักเรียน
                                  </span>
                                  <span className="text-gray-500 text-[10px]">
                                    {aGroup.totalPersonnel.toLocaleString()} บุคลากร
                                  </span>
                                </div>
                              </div>

                              {/* Schools detail within this Educational Area */}
                              <div className="space-y-1.5 pl-2 border-l-2 border-sky-200">
                                {aGroup.schools.map((sch) => (
                                  <div
                                    key={sch.school_id}
                                    onMouseEnter={() => setHoveredSchoolId(sch.school_id)}
                                    onMouseLeave={() => setHoveredSchoolId(null)}
                                    className={`flex justify-between items-center text-[11px] py-1 px-1.5 rounded transition-all cursor-pointer ${
                                      hoveredSchoolId === sch.school_id
                                        ? 'bg-rose-100 text-rose-900 font-bold border-l-2 border-rose-600'
                                        : 'text-gray-700 hover:bg-sky-50'
                                    }`}
                                  >
                                    <span className="font-medium truncate max-w-[190px]" title={sch.school_name_th}>
                                      • {sch.school_name_th}
                                    </span>
                                    <div className="text-right text-[10px] text-gray-500 shrink-0 ml-2">
                                      <span className="font-medium text-sky-700">{sch.students.toLocaleString()}</span> นักเรียน / <span className="font-medium text-sky-700">{sch.personnel.toLocaleString()}</span> บุคลากร
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic bg-white p-3 rounded text-center">
                          ไม่มีข้อมูลเขตพื้นที่การศึกษาสำหรับจังหวัดนี้
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50 flex flex-col items-center justify-center min-h-[260px]">
              <svg className="w-12 h-12 text-sky-500/60 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm font-semibold text-gray-700">คลิกจังหวัดบนแผนที่เพื่อซูมขยาย</p>
              <p className="text-xs text-gray-400 mt-1">เพื่อเจาะลึกดูข้อมูลแบ่งตามอำเภอและเขตพื้นที่</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

