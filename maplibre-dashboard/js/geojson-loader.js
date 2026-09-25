/**
 * GeoJSON load helpers + Thailand OpenGIS property normalization
 */

export async function loadGeoJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

/**
 * Normalize OpenGIS provinces → ConED property schema used by UI / feature-state.
 * Raw fields: pro_code, pro_th, pro_en, area_sqkm, ...
 */
export function normalizeProvinces(fc) {
  return {
    type: 'FeatureCollection',
    features: (fc.features || []).map((f) => {
      const p = f.properties || {};
      const zoneId = String(p.pro_code ?? f.id ?? '');
      return {
        ...f,
        id: zoneId,
        properties: {
          ...p,
          zone_id: zoneId,
          zone_code: zoneId,
          zone_name_th: p.pro_th || '',
          zone_name_en: p.pro_en || '',
          level: 'province',
          area_sqkm: Number(p.area_sqkm) || 0,
          school_count: p.school_count ?? null,
          staff_assigned: p.staff_assigned ?? null,
          student_count: p.student_count ?? null,
          profile_zone_ids: [zoneId],
        },
      };
    }),
  };
}

/**
 * Normalize OpenGIS districts (amphoe) → ConED schema.
 * Raw fields: amp_code, amp_th, amp_en, pro_code, pro_th, area_sqkm, ...
 */
export function normalizeDistricts(fc) {
  return {
    type: 'FeatureCollection',
    features: (fc.features || []).map((f) => {
      const p = f.properties || {};
      const districtId = String(p.amp_code ?? f.id ?? '');
      const provinceId = String(p.pro_code ?? '');
      return {
        ...f,
        id: districtId,
        properties: {
          ...p,
          district_id: districtId,
          district_name_th: p.amp_th || '',
          district_name_en: p.amp_en || '',
          province_id: provinceId,
          province_name_th: p.pro_th || '',
          province_name_en: p.pro_en || '',
          zone_code: provinceId,
          area_sqkm: Number(p.area_sqkm) || 0,
          school_count: p.school_count ?? null,
          staff_assigned: p.staff_assigned ?? null,
          student_count: p.student_count ?? null,
        },
      };
    }),
  };
}

/**
 * Build an index Map<province_id, Feature[]> for O(1) district subsetting.
 */
export function indexDistrictsByProvince(districtsFc) {
  const index = new Map();
  for (const f of districtsFc.features || []) {
    const key = String(f.properties?.province_id ?? '');
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(f);
  }
  return index;
}

export function filterFeatures(fc, key, value) {
  const v = String(value);
  return {
    type: 'FeatureCollection',
    features: (fc?.features || []).filter((f) => String(f.properties?.[key]) === v),
  };
}

export function getBounds(geo) {
  const features = geo.type === 'FeatureCollection' ? geo.features : [geo];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    for (const c of coords) walk(c);
  };

  for (const f of features) {
    if (f?.geometry?.coordinates) walk(f.geometry.coordinates);
  }

  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

export function applyProfileZoneFilter(fc, zoneCode) {
  if (!zoneCode) {
    return {
      filtered: fc,
      matchIds: new Set((fc.features || []).map((f) => f.id ?? f.properties?.zone_id)),
    };
  }

  const code = String(zoneCode);
  const matchIds = new Set();
  const filtered = {
    type: 'FeatureCollection',
    features: (fc.features || []).filter((f) => {
      const props = f.properties || {};
      const codes = props.profile_zone_ids || [props.zone_code, props.zone_id].filter(Boolean);
      const hit = codes.map(String).includes(code) || String(props.zone_code) === code;
      if (hit) matchIds.add(f.id ?? props.zone_id);
      return hit;
    }),
  };

  return { filtered, matchIds };
}
