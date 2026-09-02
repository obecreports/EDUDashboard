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

export const ThailandMap: React.FC<ThailandMapProps> = ({ schools }) => {
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

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

  // Pre-calculate province & district breakdown statistics using useMemo
  const { provinceStatsMap, districtStatsMap } = useMemo(() => {
    const provMap = new Map<string, { schools: number; students: number; personnel: number }>();
    const distMap = new Map<string, Map<string, { schools: number; students: number; personnel: number }>>();

    schools.forEach((s) => {
      const provName = s.province?.trim() || 'ไม่ระบุ';
      const distName = s.district?.trim() || 'ไม่ระบุ';

      // Province stats
      const pCurrent = provMap.get(provName) || { schools: 0, students: 0, personnel: 0 };
      pCurrent.schools += 1;
      pCurrent.students += s.studentSummary?.totalStudents ?? 0;
      pCurrent.personnel += s.personnelSummary?.totalPersonnel ?? 0;
      provMap.set(provName, pCurrent);

      // District stats per province
      if (!distMap.has(provName)) {
        distMap.set(provName, new Map());
      }
      const dSubMap = distMap.get(provName)!;
      const dCurrent = dSubMap.get(distName) || { schools: 0, students: 0, personnel: 0 };
      dCurrent.schools += 1;
      dCurrent.students += s.studentSummary?.totalStudents ?? 0;
      dCurrent.personnel += s.personnelSummary?.totalPersonnel ?? 0;
      dSubMap.set(distName, dCurrent);
    });

    return { provinceStatsMap: provMap, districtStatsMap: distMap };
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
  const { paths } = useMemo(() => {
    const projection = d3.geoMercator();

    if (selectedFeature) {
      // Zoom into selected province bounding box
      projection.fitExtent(
        [
          [40, 40],
          [width - 40, height - 40],
        ],
        selectedFeature as any
      );
    } else {
      // Default view for full Thailand map
      projection
        .center([100.5, 13.8])
        .scale(2600)
        .translate([width / 2, height / 2.2]);
    }

    const generator = d3.geoPath().projection(projection);

    const generatedPaths = geoFeatures.map((feat) => {
      const enName = feat.properties.NAME_1 || '';
      const thName = THAI_PROVINCE_NAMES[enName] || enName;
      const d = generator(feat as any);
      return { thName, enName, d };
    });

    return { paths: generatedPaths };
  }, [geoFeatures, selectedFeature]);

  const activeProvince = selectedProvince || hoveredProvince;
  const activeStats = activeProvince ? provinceStatsMap.get(activeProvince) : null;
  const districtsForSelected = selectedProvince ? districtStatsMap.get(selectedProvince) : null;
  const districtList = districtsForSelected ? Array.from(districtsForSelected.entries()) : [];

  return (
    <div className="border border-gray-200 p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-sky-900">แผนที่ประเทศไทย (Interactive Thailand Map)</h3>
          <p className="text-sm text-gray-500 mt-1">
            คลิกเลือกจังหวัดเพื่อ **ซูมเข้า (Zoom level)** และแสดงข้อมูลเจาะลึกระดับอำเภอ
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
                    className={`cursor-pointer transition-all duration-300 ${
                      isSelected
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
            </svg>
          )}
        </div>

        {/* Selected Province / District Detail View */}
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

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">โรงเรียน</span>
                  <span className="text-base font-bold text-sky-900">{activeStats?.schools ?? 0} แห่ง</span>
                </div>
                <div className="bg-white p-2.5 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">นักเรียน</span>
                  <span className="text-base font-bold text-sky-900">
                    {activeStats?.students ? activeStats.students.toLocaleString() : 0}
                  </span>
                </div>
                <div className="bg-white p-2.5 border border-sky-100 rounded-md">
                  <span className="text-[11px] text-gray-500 block">บุคลากร</span>
                  <span className="text-base font-bold text-sky-900">
                    {activeStats?.personnel ? activeStats.personnel.toLocaleString() : 0}
                  </span>
                </div>
              </div>

              {/* District Breakdown List */}
              {selectedProvince && (
                <div className="mt-4 pt-3 border-t border-sky-200">
                  <h5 className="text-sm font-bold text-sky-900 mb-2 flex items-center justify-between">
                    <span>จำแนกตามอำเภอ</span>
                    <span className="text-xs font-normal text-sky-700">({districtList.length} อำเภอ)</span>
                  </h5>

                  {districtList.length > 0 ? (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {districtList.map(([dName, dStats]) => (
                        <div key={dName} className="bg-white p-3 border border-sky-100 rounded-md flex justify-between items-center text-xs">
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
                      ไม่มีข้อมูลแยกอำเภอในระบบสำหรับจังหวัดนี้
                    </p>
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
              <p className="text-xs text-gray-400 mt-1">เพื่อเจาะลึกดูข้อมูลรายอำเภอ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
