/**
 * ConED Schools API → GeoJSON → MapLibre binding
 *
 * Fetches School_Basic (Supabase) or REST `/api/schools`, transforms to
 * FeatureCollection Points, then updates the `school-points` source.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { ENV } from './env.js';
import { DATA_URLS, SOURCE_IDS, LAYER_IDS, COLORS } from './config.js';

/** @typedef {{
 *   id: string,
 *   school_name: string,
 *   lat: number,
 *   lng: number,
 *   zone_id: string,
 *   province: string,
 *   province_id?: string,
 *   district?: string,
 *   survey_status: string,
 *   assigned_staff_id: string,
 *   [key: string]: any
 * }} SchoolRecord */

/* ------------------------------------------------------------------ */
/* 1. Backend API fetch                                                 */
/* ------------------------------------------------------------------ */

/**
 * Fetch real school records from Supabase School_Basic, REST API, or local fallback.
 * @param {{ province?: string, zoneId?: string }} [filters]
 * @returns {Promise<SchoolRecord[]>}
 */
export async function loadSchoolsFromDatabase(filters = {}) {
  const url = ENV.SUPABASE_URL;
  const key = ENV.SUPABASE_ANON_KEY;

  if (url && key) {
    return fetchSchoolsFromSupabase(url, key, filters);
  }

  if (ENV.SCHOOLS_API_URL) {
    return fetchSchoolsFromRest(ENV.SCHOOLS_API_URL, filters);
  }

  console.warn(
    '[ConED] No Supabase/REST credentials — falling back to ./data/schools.geojson. ' +
      'Set window.CONED_SUPABASE_URL + CONED_SUPABASE_ANON_KEY or edit js/env.js.'
  );
  return fetchSchoolsFromLocalGeoJSON(filters);
}

/**
 * Mirrors src/services/supabase.ts → School_Basic + School_People + Gov_Domain
 */
async function fetchSchoolsFromSupabase(supabaseUrl, anonKey, filters) {
  const supabase = createClient(supabaseUrl, anonKey);

  let query = supabase.from('School_Basic').select('*');

  if (filters.province) query = query.eq('province_name', filters.province);
  if (filters.zoneId) query = query.eq('area_id', filters.zoneId);

  const { data: basics, error } = await query;
  if (error) {
    console.error('[ConED] Supabase School_Basic error:', error);
    throw error;
  }

  const rows = basics ?? [];
  if (rows.length === 0) return [];

  const schoolIds = rows.map((b) => b.school_id).filter((id) => id != null && id !== '');

  const [peopleRows, govRes] = await Promise.all([
    fetchPeopleInBatches(supabase, schoolIds),
    supabase.from('Gov_Domain').select('area_id, area_name'),
  ]);

  if (govRes.error) console.warn('[ConED] Gov_Domain warning:', govRes.error);

  const peopleMap = new Map();
  for (const p of peopleRows) {
    if (p?.school_id == null) continue;
    // Index by both string + raw id so number/string school_id always match
    peopleMap.set(String(p.school_id), p);
    peopleMap.set(p.school_id, p);
  }

  const govMap = new Map();
  (govRes.data ?? []).forEach((g) => {
    if (g.area_id != null) {
      govMap.set(String(g.area_id), g);
      govMap.set(g.area_id, g);
    }
  });

  const records = rows
    .map((basic) => {
      const people =
        peopleMap.get(basic.school_id) ||
        peopleMap.get(String(basic.school_id)) ||
        {};
      const gov =
        (basic.area_id != null &&
          (govMap.get(basic.area_id) || govMap.get(String(basic.area_id)))) ||
        {};
      const { students, personnel } = extractPeopleCounts(people);

      return normalizeDbRow({
        ...basic,
        // Prefer People table metrics (do not let empty basic fields win)
        student_count: students,
        sum_student: students,
        staff_assigned: personnel,
        actual_teacher: personnel,
        area_name: gov.area_name || basic.area_name,
        Gov_Domain: gov,
        School_People: people,
      });
    })
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));

  const withStudents = records.filter((r) => r.student_count > 0).length;
  const withStaff = records.filter((r) => r.staff_assigned > 0).length;
  console.info(
    `[ConED] Schools ${records.length} · with students ${withStudents} · with staff ${withStaff} · people rows ${peopleRows.length}`
  );

  return records;
}

/** PostgREST `.in()` URL length limits — fetch School_People in chunks */
async function fetchPeopleInBatches(supabase, schoolIds, chunkSize = 150) {
  if (!schoolIds.length) return [];

  const all = [];
  for (let i = 0; i < schoolIds.length; i += chunkSize) {
    const chunk = schoolIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('School_People')
      .select('*')
      .in('school_id', chunk);

    if (error) {
      console.warn('[ConED] School_People batch error:', error.message || error);
      continue;
    }
    if (data?.length) all.push(...data);
  }
  return all;
}

/**
 * Resolve student / staff totals from a School_People row (same fields as React app).
 */
export function extractPeopleCounts(people = {}) {
  const num = (v) => {
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  let students = num(people.sum_student);
  if (students <= 0) {
    // Fallback: sum level totals when sum_student is missing
    const keys = Object.keys(people).filter(
      (k) => /_(sum|all_sum)$/i.test(k) || k === 'kinder_all' || k === 'primary_all'
    );
    // Prefer explicit all_sum group fields
    const groupSum =
      num(people.kinder_all_sum) +
      num(people.primary_all_sum) +
      num(people.middle_all_sum) +
      num(people.highschool_all_sum) +
      num(people.Voca_all_sum);
    if (groupSum > 0) {
      students = groupSum;
    } else {
      students = keys.reduce((acc, k) => acc + num(people[k]), 0);
    }
  }

  let personnel =
    num(people.actual_teacher) ||
    num(people.actual_tea) ||
    num(people.sum_teacher) ||
    num(people.teacher_all);

  if (personnel <= 0) {
    personnel =
      num(people.teacher_d) +
      num(people.teacher_g) +
      num(people.admin_d) +
      num(people.admin_g);
  }

  return { students, personnel };
}

async function fetchSchoolsFromRest(apiUrl, filters) {
  const url = new URL(apiUrl, window.location.origin);
  if (filters.province) url.searchParams.set('province', filters.province);
  if (filters.zoneId) url.searchParams.set('zone_id', filters.zoneId);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Schools API ${res.status}`);
  const payload = await res.json();
  const rows = Array.isArray(payload) ? payload : payload.data || payload.schools || [];
  return rows.map(normalizeDbRow).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

async function fetchSchoolsFromLocalGeoJSON(filters) {
  const res = await fetch(DATA_URLS.schoolsFallback || DATA_URLS.schools);
  if (!res.ok) throw new Error(`Fallback GeoJSON ${res.status}`);
  const fc = await res.json();
  let records = (fc.features || []).map((f) => {
    const p = f.properties || {};
    const [lng, lat] = f.geometry?.coordinates || [];
    return normalizeDbRow({
      school_id: p.school_id || f.id,
      school_name: p.school_name_th || p.school_name,
      lat,
      long: lng,
      province_name: p.province_name_th || p.province,
      district_name: p.district_name_th || p.district,
      area_id: p.zone_code || p.zone_id || p.area_id,
      area_name: p.area_name || p.organize_domain,
      organize_domain: p.organize_domain || p.area_name,
      director_name: p.director_name,
      survey_status: p.survey_status,
      assigned_staff_id: p.assigned_staff_id || p.director_name,
      school_size: p.school_size,
      staff_assigned: p.staff_assigned,
      student_count: p.student_count,
      province_id: p.province_id,
    });
  });

  if (filters.province) {
    records = records.filter((r) => r.province === filters.province);
  }
  if (filters.zoneId) {
    records = records.filter((r) => String(r.zone_id) === String(filters.zoneId));
  }
  return records;
}

/**
 * Normalize heterogeneous DB / API rows into the canonical SchoolRecord shape.
 * @param {Record<string, any>} row
 * @returns {SchoolRecord}
 */
export function normalizeDbRow(row) {
  const lat = Number(row.lat ?? row.latitude);
  const lng = Number(row.lng ?? row.long ?? row.longitude);
  const id = String(row.id ?? row.school_id ?? '');
  const areaId = String(row.zone_id ?? row.area_id ?? row.zone_code ?? '');
  const areaName =
    row.area_name ||
    row.Gov_Domain?.area_name ||
    row.organize_domain ||
    (areaId ? `เขตพื้นที่ ${areaId}` : 'ไม่ระบุเขตพื้นที่');
  const areaKey = areaId || areaName;

  // Prefer explicit joined metrics; coerce numeric strings from Postgres
  const toNum = (v) => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const fromPeople = row.School_People ? extractPeopleCounts(row.School_People) : null;

  const students =
    toNum(row.student_count) ??
    toNum(row.sum_student) ??
    fromPeople?.students ??
    toNum(row.total_students) ??
    0;

  const personnel =
    toNum(row.staff_assigned) ??
    toNum(row.actual_teacher) ??
    toNum(row.actual_tea) ??
    fromPeople?.personnel ??
    toNum(row.total_personnel) ??
    0;

  const survey =
    row.survey_status ||
    row.status ||
    deriveSurveyStatus(row, id);

  return {
    id,
    school_id: id,
    school_name: row.school_name || row.school_name_th || 'ไม่ระบุชื่อ',
    school_name_th: row.school_name_th || row.school_name || 'ไม่ระบุชื่อ',
    school_name_en: row.school_name_en || '',
    lat,
    lng,
    zone_id: areaId,
    area_id: areaId,
    area_name: areaName,
    area_key: areaKey,
    province: row.province || row.province_name || row.province_name_th || '',
    province_id: row.province_id != null ? String(row.province_id) : '',
    district: row.district || row.district_name || row.district_name_th || '',
    survey_status: survey,
    assigned_staff_id: String(
      row.assigned_staff_id ?? row.staff_id ?? row.director_name ?? ''
    ),
    director_name: row.director_name || '',
    school_size: row.school_size || '',
    staff_assigned: personnel,
    student_count: students,
    students,
    personnel,
    organize_domain: row.organize_domain || '',
  };
}

function deriveSurveyStatus(row, id) {
  if (row.School_Score || row.has_score) return 'Surveyed';
  // Deterministic demo distribution when DB has no survey_status column
  const n = Number(String(id).replace(/\D/g, '').slice(-2)) || 0;
  if (n % 3 === 0) return 'Pending';
  if (n % 3 === 1) return 'Surveyed';
  return 'Active';
}

/* ------------------------------------------------------------------ */
/* 2. Array → GeoJSON transformer                                       */
/* ------------------------------------------------------------------ */

/**
 * Map database records → GeoJSON FeatureCollection (Point [lng, lat]).
 * @param {SchoolRecord[]} schoolArray
 * @param {{ provinceNameToCode?: Map<string, string> }} [opts]
 * @returns {GeoJSON.FeatureCollection}
 */
export function transformToGeoJSON(schoolArray, opts = {}) {
  const nameToCode = opts.provinceNameToCode;

  const features = (schoolArray || [])
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => {
      let provinceId = s.province_id || '';
      if (!provinceId && nameToCode && s.province) {
        provinceId = nameToCode.get(s.province.trim()) || '';
      }

      return {
        type: 'Feature',
        id: s.id,
        properties: {
          ...s,
          school_id: s.id,
          school_name: s.school_name,
          school_name_th: s.school_name_th || s.school_name,
          zone_id: String(s.zone_id ?? ''),
          area_id: String(s.area_id ?? s.zone_id ?? ''),
          area_name: s.area_name || '',
          area_key: s.area_key || String(s.zone_id || s.area_name || ''),
          province: s.province,
          province_id: provinceId,
          province_name_th: s.province,
          district: s.district,
          district_name_th: s.district,
          student_count: s.student_count ?? s.students ?? 0,
          staff_assigned: s.staff_assigned ?? s.personnel ?? 0,
          survey_status: s.survey_status,
          assigned_staff_id: s.assigned_staff_id,
        },
        geometry: {
          type: 'Point',
          coordinates: [s.lng, s.lat],
        },
      };
    });

  return { type: 'FeatureCollection', features };
}

/* ------------------------------------------------------------------ */
/* 3. MapLibre data binding                                             */
/* ------------------------------------------------------------------ */

/**
 * Push GeoJSON into the `school-points` source (create if missing).
 * @param {import('maplibre-gl').Map} map
 * @param {GeoJSON.FeatureCollection} geoJsonData
 */
export function updateSchoolPointsSource(map, geoJsonData) {
  const existing = map.getSource(SOURCE_IDS.schools);
  if (existing) {
    existing.setData(geoJsonData);
    return;
  }

  map.addSource(SOURCE_IDS.schools, {
    type: 'geojson',
    data: geoJsonData,
    promoteId: 'school_id',
    cluster: false,
  });
}

/**
 * Add school circle layers (glow ring + rose pin).
 * Glow uses feature-state `glow` for group/area highlights without setData.
 * @param {import('maplibre-gl').Map} map
 */
export function addSchoolPointsLayer(map) {
  if (map.getLayer(LAYER_IDS.schools)) return;

  if (!map.getSource(SOURCE_IDS.schools)) {
    map.addSource(SOURCE_IDS.schools, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'school_id',
    });
  }

  // Soft amber halo for glow / pulse (legacy ping effect)
  map.addLayer({
    id: LAYER_IDS.schoolsGlow,
    type: 'circle',
    source: SOURCE_IDS.schools,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'glow'], false],
        16,
        ['boolean', ['feature-state', 'hover'], false],
        14,
        0,
      ],
      'circle-color': COLORS.schoolHover,
      'circle-opacity': [
        'case',
        ['boolean', ['feature-state', 'glow'], false],
        0.35,
        ['boolean', ['feature-state', 'hover'], false],
        0.4,
        0,
      ],
      'circle-stroke-width': 0,
    },
  });

  map.addLayer({
    id: LAYER_IDS.schools,
    type: 'circle',
    source: SOURCE_IDS.schools,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'glow'], false],
        8.5,
        ['boolean', ['feature-state', 'hover'], false],
        8,
        5.5,
      ],
      'circle-color': [
        'case',
        ['any',
          ['boolean', ['feature-state', 'glow'], false],
          ['boolean', ['feature-state', 'hover'], false],
        ],
        COLORS.schoolHover,
        COLORS.school,
      ],
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'glow'], false],
        2.5,
        1.75,
      ],
      'circle-stroke-color': [
        'case',
        ['boolean', ['feature-state', 'glow'], false],
        '#0f172a',
        '#ffffff',
      ],
      'circle-opacity': 0.95,
    },
  });
}

/**
 * Load DB → transform → setData on `school-points`.
 * @param {import('maplibre-gl').Map} map
 * @param {object} [options]
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
export async function loadAndBindSchools(map, options = {}) {
  const records = await loadSchoolsFromDatabase(options.filters || {});
  const geojson = transformToGeoJSON(records, {
    provinceNameToCode: options.provinceNameToCode,
  });

  addSchoolPointsLayer(map);
  updateSchoolPointsSource(map, geojson);

  return geojson;
}

/* ------------------------------------------------------------------ */
/* 4. Profile sync: setFilter + fitBounds                               */
/* ------------------------------------------------------------------ */

/**
 * Show only schools in the logged-in staff member's zone, then frame them.
 *
 * @param {import('maplibre-gl').Map} map
 * @param {string|null} userZoneId  area_id / zone_id from user profile
 * @param {{
 *   layerId?: string,
 *   geojson?: GeoJSON.FeatureCollection,
 *   fit?: boolean,
 *   filterField?: 'zone_id' | 'province_id' | 'province',
 * }} [opts]
 * @returns {{ matchCount: number, bounds: [number,number,number,number]|null }}
 */
export function syncMapToUserProfile(map, userZoneId, opts = {}) {
  const layerId = opts.layerId || LAYER_IDS.schools;
  const field = opts.filterField || 'zone_id';
  const fit = opts.fit !== false;

  if (!map.getLayer(layerId)) {
    return { matchCount: 0, bounds: null };
  }

  if (userZoneId == null || userZoneId === '') {
    map.setFilter(layerId, null);
    return { matchCount: -1, bounds: null };
  }

  const zone = String(userZoneId);
  map.setFilter(layerId, ['==', ['to-string', ['get', field]], zone]);
  map.setLayoutProperty(layerId, 'visibility', 'visible');

  const geojson = opts.geojson;
  let bounds = null;
  let matchCount = 0;

  if (geojson?.features?.length) {
    const matched = geojson.features.filter(
      (f) => String(f.properties?.[field] ?? '') === zone
    );
    matchCount = matched.length;
    bounds = boundsFromPoints(matched);

    if (fit && bounds) {
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1100,
        maxZoom: 11,
        essential: true,
      });
    }
  }

  return { matchCount, bounds };
}

/**
 * Combined filter for province drill-down while keeping profile zone (if any).
 */
export function setSchoolMapFilter(map, expression) {
  for (const id of [LAYER_IDS.schools, LAYER_IDS.schoolsGlow]) {
    if (!map.getLayer(id)) continue;
    map.setFilter(id, expression);
  }
}

export function setSchoolLayersVisibility(map, visible) {
  const vis = visible ? 'visible' : 'none';
  for (const id of [LAYER_IDS.schools, LAYER_IDS.schoolsGlow]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
  }
}

function boundsFromPoints(features) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const f of features) {
    const [lng, lat] = f.geometry?.coordinates || [];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < minX) minX = lng;
    if (lat < minY) minY = lat;
    if (lng > maxX) maxX = lng;
    if (lat > maxY) maxY = lat;
  }

  if (!Number.isFinite(minX)) return null;
  // Pad tiny single-point bounds
  if (minX === maxX) {
    minX -= 0.05;
    maxX += 0.05;
  }
  if (minY === maxY) {
    minY -= 0.05;
    maxY += 0.05;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Build Thai province name → pro_code map from OpenGIS province FC.
 */
export function buildProvinceNameToCodeMap(provincesFc) {
  const map = new Map();
  for (const f of provincesFc?.features || []) {
    const th = (f.properties?.zone_name_th || f.properties?.pro_th || '').trim();
    const code = String(f.properties?.zone_id || f.properties?.pro_code || '');
    if (th && code) map.set(th, code);
  }
  return map;
}
