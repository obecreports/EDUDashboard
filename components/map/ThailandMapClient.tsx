'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SchoolFull } from '@/lib/types';

const PROVINCES_URL =
  'https://cdn.jsdelivr.net/gh/chingchai/OpenGISData-Thailand@master/provinces.geojson';
const DISTRICTS_URL =
  'https://cdn.jsdelivr.net/gh/chingchai/OpenGISData-Thailand@master/districts.geojson';

const FIT: [[number, number], [number, number]] = [
  [97.34, 5.61],
  [105.64, 20.46],
];
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [94.0, 3.2],
  [109.0, 23.0],
];

type GroupMode = 'district' | 'area';
type ProvinceFC = GeoJSON.FeatureCollection;

function provinceName(f: GeoJSON.Feature): string {
  return String(f.properties?.pro_th || f.properties?.name_th || f.properties?.name || '');
}

function provinceId(f: GeoJSON.Feature): string | number | null {
  const id = f.properties?.pro_code ?? f.id;
  return id == null ? null : (id as string | number);
}

function districtName(f: GeoJSON.Feature): string {
  return String(f.properties?.amp_th || f.properties?.name_th || f.properties?.name || '');
}

function districtId(f: GeoJSON.Feature): string | number | null {
  const id = f.properties?.amp_code ?? f.id;
  return id == null ? null : (id as string | number);
}

/** Normalize Thai district labels for school ↔ GeoJSON matching */
export function normalizeDistrictLabel(n: string): string {
  return n
    .replace(/^อำเภอ\s*/u, '')
    .replace(/^เขต\s*/u, '')
    .trim()
    .toLowerCase();
}

function sanitizeBasemap(map: MapLibreMap) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    try {
      if (layer.type === 'symbol' || layer.type === 'hillshade') {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      } else if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', '#e2e8f0');
      } else if (layer.type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-opacity', 0.18);
      }
    } catch {
      /* ignore */
    }
  }
}

function schoolsToGeoJSON(schools: SchoolFull[]) {
  return {
    type: 'FeatureCollection' as const,
    features: schools
      .filter((s) => Number(s.longitude) && Number(s.latitude))
      .map((s) => ({
        type: 'Feature' as const,
        id: String(s.school_id),
        properties: {
          school_id: String(s.school_id),
          school_name_th: s.school_name_th,
          district: s.district ?? '',
          province: s.province ?? '',
          area_name: s.area_name ?? '',
          area_id: s.area_id ?? '',
          students: s.studentSummary?.totalStudents ?? 0,
          personnel: s.personnelSummary?.totalPersonnel ?? 0,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(s.longitude), Number(s.latitude)],
        },
      })),
  };
}

function applyProvinceBaseStates(
  map: MapLibreMap,
  provinces: ProvinceFC,
  schoolProvinceNames: Set<string>
) {
  for (const pf of provinces.features) {
    const id = provinceId(pf);
    if (id == null) continue;
    const name = provinceName(pf);
    map.setFeatureState(
      { source: 'provinces', id },
      {
        hasSchools: schoolProvinceNames.has(name),
        selected: false,
        dimmed: false,
        hover: false,
      }
    );
  }
}

function clearProvinceInteractionStates(map: MapLibreMap, provinces: ProvinceFC) {
  for (const pf of provinces.features) {
    const id = provinceId(pf);
    if (id == null) continue;
    const prev = map.getFeatureState({ source: 'provinces', id });
    map.setFeatureState(
      { source: 'provinces', id },
      {
        hasSchools: Boolean(prev?.hasSchools),
        selected: false,
        dimmed: false,
        hover: false,
      }
    );
  }
}

function clearAllDistrictHover(map: MapLibreMap, districts: ProvinceFC | null) {
  if (!districts) return;
  for (const df of districts.features) {
    const id = districtId(df);
    if (id == null) continue;
    map.setFeatureState({ source: 'districts', id }, { hover: false });
  }
}

function formatSchoolLabel(s: SchoolFull, mode: GroupMode): string {
  const name = s.school_name_th || '—';
  if (mode !== 'area') return name;
  const raw = (s.district || '').trim();
  if (!raw) return name;
  const short = raw.replace(/^อำเภอ\s*/u, '').replace(/^เขต\s*/u, '').trim();
  return short ? `${name} (อ.${short})` : name;
}

function sortSchoolsForMode(list: SchoolFull[], mode: GroupMode): SchoolFull[] {
  const copy = [...list];
  if (mode === 'area') {
    copy.sort((a, b) => {
      const d = (a.district || '').localeCompare(b.district || '', 'th');
      if (d !== 0) return d;
      return (a.school_name_th || '').localeCompare(b.school_name_th || '', 'th');
    });
  } else {
    copy.sort((a, b) => (a.school_name_th || '').localeCompare(b.school_name_th || '', 'th'));
  }
  return copy;
}

export function ThailandMapClient({ schools }: { schools: SchoolFull[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const provincesRef = useRef<ProvinceFC | null>(null);
  const loadedDistrictsRef = useRef<ProvinceFC | null>(null);
  const activeDistrictsRef = useRef<ProvinceFC | null>(null);
  const listRefs = useRef<Map<string, HTMLElement>>(new Map());
  const hoverFromPanelRef = useRef(false);
  const selectedProvinceRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>('district');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>(''); // clicked district/area from sidebar
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverProvince, setHoverProvince] = useState<string | null>(null);
  const [hoverDistrict, setHoverDistrict] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  selectedProvinceRef.current = selectedProvince;

  const geojson = useMemo(() => schoolsToGeoJSON(schools), [schools]);

  const schoolProvinceNames = useMemo(() => {
    const set = new Set<string>();
    schools.forEach((s) => {
      if (s.province?.trim()) set.add(s.province.trim());
    });
    return set;
  }, [schools]);

  const provinceStats = useMemo(() => {
    const map = new Map<string, number>();
    schools.forEach((s) => {
      const p = s.province?.trim();
      if (!p) return;
      map.set(p, (map.get(p) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));
  }, [schools]);

  const groups = useMemo(() => {
    const scoped = selectedProvince
      ? schools.filter((s) => s.province === selectedProvince)
      : schools;
    const map = new Map<string, { name: string; schools: SchoolFull[]; students: number }>();
    for (const s of scoped) {
      const key =
        groupMode === 'district'
          ? s.district || 'ไม่ระบุอำเภอ'
          : s.area_name || s.area_id || 'ไม่ระบุเขต';
      const row = map.get(key) ?? { name: key, schools: [], students: 0 };
      row.schools.push(s);
      row.students += s.studentSummary?.totalStudents ?? 0;
      map.set(key, row);
    }
    return [...map.values()]
      .map((g) => ({ ...g, schools: sortSchoolsForMode(g.schools, groupMode) }))
      .sort((a, b) =>
        groupMode === 'area'
          ? a.name.localeCompare(b.name, 'th')
          : b.schools.length - a.schools.length || a.name.localeCompare(b.name, 'th')
      );
  }, [schools, selectedProvince, groupMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [101, 13.5],
      zoom: 5,
      minZoom: 4.35,
      maxZoom: 14,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
      antialias: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', async () => {
      sanitizeBasemap(map);
      map.fitBounds(FIT, {
        padding: { top: 48, bottom: 48, left: 48, right: 48 },
        duration: 0,
        maxZoom: 6.2,
      });

      const [provinces, districts] = await Promise.all([
        fetch(PROVINCES_URL).then((r) => r.json() as Promise<ProvinceFC>),
        fetch(DISTRICTS_URL).then((r) => r.json() as Promise<ProvinceFC>),
      ]);

      provincesRef.current = provinces;
      loadedDistrictsRef.current = districts;

      const [[w, s], [e, n]] = MAX_BOUNDS;
      const inset = 0.15;
      map.addSource('mask', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [[[w, s], [FIT[0][0] + inset, s], [FIT[0][0] + inset, n], [w, n], [w, s]]],
              [[[FIT[1][0] - inset, s], [e, s], [e, n], [FIT[1][0] - inset, n], [FIT[1][0] - inset, s]]],
              [[[FIT[0][0] + inset, s], [FIT[1][0] - inset, s], [FIT[1][0] - inset, FIT[0][1] + inset], [FIT[0][0] + inset, FIT[0][1] + inset], [FIT[0][0] + inset, s]]],
              [[[FIT[0][0] + inset, FIT[1][1] - inset], [FIT[1][0] - inset, FIT[1][1] - inset], [FIT[1][0] - inset, n], [FIT[0][0] + inset, n], [FIT[0][0] + inset, FIT[1][1] - inset]]],
            ],
          },
        },
      });
      map.addLayer({
        id: 'mask-fill',
        type: 'fill',
        source: 'mask',
        paint: { 'fill-color': '#e2e8f0', 'fill-opacity': 0.92, 'fill-antialias': true },
      });

      map.addSource('provinces', {
        type: 'geojson',
        data: provinces,
        promoteId: 'pro_code',
        tolerance: 0,
      });
      map.addLayer({
        id: 'province-fill',
        type: 'fill',
        source: 'provinces',
        paint: {
          'fill-antialias': true,
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#0ea5e9',
            ['boolean', ['feature-state', 'selected'], false],
            '#0284c7',
            ['boolean', ['feature-state', 'hasSchools'], false],
            '#0369a1',
            '#bae6fd',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.9,
            ['boolean', ['feature-state', 'selected'], false],
            0.85,
            ['boolean', ['feature-state', 'dimmed'], false],
            0.12,
            ['boolean', ['feature-state', 'hasSchools'], false],
            0.62,
            0.22,
          ],
        },
      });
      map.addLayer({
        id: 'province-line',
        type: 'line',
        source: 'provinces',
        paint: { 'line-color': '#fff', 'line-width': 0.8 },
      });

      applyProvinceBaseStates(map, provinces, schoolProvinceNames);

      map.addSource('districts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'amp_code',
        tolerance: 0,
      });
      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        layout: { visibility: 'none' },
        paint: {
          'fill-antialias': true,
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#ea580c',
            '#fbbf24',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.88,
            0.32,
          ],
        },
      });
      map.addLayer({
        id: 'district-line',
        type: 'line',
        source: 'districts',
        layout: { visibility: 'none' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#c2410c',
            '#ffffff',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            3.5,
            0.9,
          ],
          'line-opacity': 1,
        },
      });

      map.addSource('schools', { type: 'geojson', data: geojson, promoteId: 'school_id' });
      map.addLayer({
        id: 'schools-circle',
        type: 'circle',
        source: 'schools',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            8,
            5,
          ],
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#fbbf24',
            '#e11d48',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      });

      map.on('click', 'province-fill', (e) => {
        if (selectedProvinceRef.current) return; // drill-down mode: ignore province clicks
        const f = e.features?.[0];
        if (!f) return;
        const name = provinceName(f as GeoJSON.Feature);
        if (!name) return;
        setSelectedScope('');
        setSelectedProvince(name);
        setHoverProvince(null);
        setHoverDistrict(null);
      });

      let hoveredProvinceId: string | number | null = null;
      map.on('mousemove', 'province-fill', (e) => {
        // When drilled into a province, do NOT highlight whole province — districts handle hover
        if (selectedProvinceRef.current) {
          map.getCanvas().style.cursor = '';
          return;
        }
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        const id = f.id ?? f.properties?.pro_code;
        if (id == null) return;
        if (hoveredProvinceId != null && hoveredProvinceId !== id) {
          const prev = map.getFeatureState({ source: 'provinces', id: hoveredProvinceId });
          map.setFeatureState(
            { source: 'provinces', id: hoveredProvinceId },
            { ...prev, hover: false }
          );
        }
        hoveredProvinceId = id as string | number;
        const cur = map.getFeatureState({ source: 'provinces', id });
        map.setFeatureState({ source: 'provinces', id }, { ...cur, hover: true });

        if (!hoverFromPanelRef.current) {
          setHoverProvince(provinceName(f as GeoJSON.Feature) || null);
        }
      });
      map.on('mouseleave', 'province-fill', () => {
        if (selectedProvinceRef.current) return;
        map.getCanvas().style.cursor = '';
        if (hoveredProvinceId != null) {
          const prev = map.getFeatureState({
            source: 'provinces',
            id: hoveredProvinceId,
          });
          map.setFeatureState(
            { source: 'provinces', id: hoveredProvinceId },
            { ...prev, hover: false }
          );
          hoveredProvinceId = null;
        }
        if (!hoverFromPanelRef.current) setHoverProvince(null);
      });

      // District-only hover (glow that district boundary alone)
      let hoveredDistrictId: string | number | null = null;
      map.on('mousemove', 'district-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        const id = f.id ?? f.properties?.amp_code;
        if (id == null) return;

        if (hoveredDistrictId != null && hoveredDistrictId !== id) {
          map.setFeatureState({ source: 'districts', id: hoveredDistrictId }, { hover: false });
        }
        hoveredDistrictId = id as string | number;
        map.setFeatureState({ source: 'districts', id }, { hover: true });

        if (!hoverFromPanelRef.current) {
          const name = districtName(f as GeoJSON.Feature);
          setHoverDistrict(name || null);
          setHoverKey(name ? `group:${name}` : null);
        }
      });
      map.on('mouseleave', 'district-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredDistrictId != null) {
          map.setFeatureState({ source: 'districts', id: hoveredDistrictId }, { hover: false });
          hoveredDistrictId = null;
        }
        if (!hoverFromPanelRef.current) {
          setHoverDistrict(null);
          setHoverKey(null);
        }
      });

      let hoveredSchool: string | null = null;
      map.on('mousemove', 'schools-circle', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = String(e.features?.[0]?.properties?.school_id ?? '');
        if (!id) return;
        if (hoveredSchool && hoveredSchool !== id) {
          map.setFeatureState({ source: 'schools', id: hoveredSchool }, { hover: false });
        }
        hoveredSchool = id;
        map.setFeatureState({ source: 'schools', id }, { hover: true });
        setHoverKey(id);
      });
      map.on('mouseleave', 'schools-circle', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredSchool) {
          map.setFeatureState({ source: 'schools', id: hoveredSchool }, { hover: false });
          hoveredSchool = null;
        }
        setHoverKey(null);
      });

      setReady(true);
      setLoading(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !provincesRef.current) return;
    applyProvinceBaseStates(map, provincesRef.current, schoolProvinceNames);
  }, [schoolProvinceNames, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource('schools') as GeoJSONSource | undefined;
    src?.setData(geojson);
  }, [geojson, ready]);

  /** Sync MapLibre when province selection changes (sidebar or map click) */
  useEffect(() => {
    const map = mapRef.current;
    const provinces = provincesRef.current;
    const allDistricts = loadedDistrictsRef.current;
    if (!map || !ready || !provinces || !allDistricts) return;

    if (!selectedProvince) {
      activeDistrictsRef.current = null;
      map.setLayoutProperty('district-fill', 'visibility', 'none');
      map.setLayoutProperty('district-line', 'visibility', 'none');
      (map.getSource('districts') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      });
      clearProvinceInteractionStates(map, provinces);
      applyProvinceBaseStates(map, provinces, schoolProvinceNames);
      map.fitBounds(FIT, { padding: 48, duration: 800, maxZoom: 6.2 });
      return;
    }

    const feature = provinces.features.find((f) => provinceName(f) === selectedProvince);
    if (!feature) return;

    const code = String(feature.properties?.pro_code ?? feature.id ?? '');
    const filtered: ProvinceFC = {
      type: 'FeatureCollection',
      features: (allDistricts.features || []).filter(
        (d) =>
          String(d.properties?.pro_code ?? '').startsWith(code.slice(0, 2)) ||
          String(d.properties?.pro_th || '') === selectedProvince
      ),
    };
    activeDistrictsRef.current = filtered;
    (map.getSource('districts') as GeoJSONSource).setData(filtered);
    map.setLayoutProperty('district-fill', 'visibility', 'visible');
    map.setLayoutProperty('district-line', 'visibility', 'visible');

    const selectedId = String(feature.id ?? feature.properties?.pro_code);
    for (const pf of provinces.features) {
      const id = provinceId(pf);
      if (id == null) continue;
      const prev = map.getFeatureState({ source: 'provinces', id });
      map.setFeatureState(
        { source: 'provinces', id },
        {
          hasSchools: Boolean(prev?.hasSchools),
          selected: String(id) === selectedId,
          dimmed: String(id) !== selectedId,
          hover: false,
        }
      );
    }

    const bounds = new maplibregl.LngLatBounds();
    const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const rings =
      geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
    rings.forEach((ring) => {
      ring.forEach((c) => bounds.extend(c as [number, number]));
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 900 });
    }
  }, [selectedProvince, ready, schoolProvinceNames]);

  /** Fly to district polygon or area school cluster when scope dropdown changes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedProvince || !selectedScope) return;

    if (groupMode === 'district') {
      const districts = activeDistrictsRef.current;
      if (!districts) return;
      clearAllDistrictHover(map, districts);
      const target = normalizeDistrictLabel(selectedScope);
      let matched: GeoJSON.Feature | null = null;
      for (const df of districts.features) {
        const id = districtId(df);
        if (id == null) continue;
        const name = districtName(df);
        const match =
          normalizeDistrictLabel(name) === target ||
          normalizeDistrictLabel(name).includes(target) ||
          target.includes(normalizeDistrictLabel(name));
        map.setFeatureState({ source: 'districts', id }, { hover: match });
        if (match) matched = df;
      }
      if (matched?.geometry) {
        const bounds = new maplibregl.LngLatBounds();
        const geom = matched.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
        const rings =
          geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
        rings.forEach((ring) => {
          ring.forEach((c) => bounds.extend(c as [number, number]));
        });
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 700 });
        }
      }
      setHoverDistrict(selectedScope);
      setHoverKey(`group:${selectedScope}`);
      return;
    }

    // Educational area — fit to school points in that area
    const pts = schools.filter(
      (s) =>
        s.province === selectedProvince &&
        (s.area_name || s.area_id || 'ไม่ระบุเขต') === selectedScope &&
        Number(s.longitude) &&
        Number(s.latitude)
    );
    if (pts.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    pts.forEach((s) => bounds.extend([Number(s.longitude), Number(s.latitude)]));
    map.fitBounds(bounds, { padding: 64, maxZoom: 11, duration: 700 });
    setHoverKey(`group:${selectedScope}`);
  }, [selectedScope, groupMode, selectedProvince, ready, schools]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const f of geojson.features) {
      const id = String(f.properties.school_id);
      map.setFeatureState(
        { source: 'schools', id },
        {
          hover:
            hoverKey === id ||
            hoverKey === `group:${f.properties.district}` ||
            hoverKey === `group:${f.properties.area_name}`,
        }
      );
    }
  }, [hoverKey, ready, geojson]);

  // Province panel ↔ map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !provincesRef.current || selectedProvince) return;

    for (const pf of provincesRef.current.features) {
      const id = provinceId(pf);
      if (id == null) continue;
      const name = provinceName(pf);
      const prev = map.getFeatureState({ source: 'provinces', id });
      map.setFeatureState(
        { source: 'provinces', id },
        { ...prev, hover: hoverProvince != null && name === hoverProvince }
      );
    }

    if (hoverProvince) {
      listRefs.current.get(hoverProvince)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [hoverProvince, ready, selectedProvince]);

  // District panel ↔ map: highlight ONLY matching district polygon
  useEffect(() => {
    const map = mapRef.current;
    const districts = activeDistrictsRef.current;
    if (!map || !ready || !districts) return;
    if (selectedScope && groupMode === 'district') return;

    clearAllDistrictHover(map, districts);

    if (!hoverDistrict) return;

    const target = normalizeDistrictLabel(hoverDistrict);
    for (const df of districts.features) {
      const id = districtId(df);
      if (id == null) continue;
      const name = districtName(df);
      const match =
        normalizeDistrictLabel(name) === target ||
        normalizeDistrictLabel(name).includes(target) ||
        target.includes(normalizeDistrictLabel(name));
      if (match) {
        map.setFeatureState({ source: 'districts', id }, { hover: true });
      }
    }

    if (hoverDistrict && selectedProvince) {
      listRefs.current
        .get(`district:${hoverDistrict}`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [hoverDistrict, ready, selectedProvince, selectedScope, groupMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const t = window.setTimeout(() => map.resize(), 80);
    return () => window.clearTimeout(t);
  }, [fullscreen, ready]);

  const reset = () => {
    setSelectedProvince(null);
    setSelectedScope('');
    setHoverProvince(null);
    setHoverDistrict(null);
    setHoverKey(null);
    hoverFromPanelRef.current = false;
  };

  const selectProvinceFromSidebar = (name: string) => {
    setSelectedScope('');
    setHoverDistrict(null);
    setHoverKey(null);
    setSelectedProvince(name);
  };

  const selectGroupFromSidebar = (name: string) => {
    setSelectedScope(name);
  };

  const onProvinceRowEnter = (name: string) => {
    hoverFromPanelRef.current = true;
    setHoverProvince(name);
  };
  const onProvinceRowLeave = () => {
    hoverFromPanelRef.current = false;
    setHoverProvince(null);
  };

  const onDistrictRowEnter = (name: string) => {
    hoverFromPanelRef.current = true;
    setHoverDistrict(name);
    setHoverKey(`group:${name}`);
  };
  const onDistrictRowLeave = () => {
    hoverFromPanelRef.current = false;
    if (!selectedScope) {
      setHoverDistrict(null);
      setHoverKey(null);
    }
  };

  return (
    <div className={`map-layout ${fullscreen ? 'map-layout--fullscreen' : ''}`}>
      <div className="relative panel-card p-0 overflow-hidden map-layout__canvas">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 text-tm-blue font-medium">
            กำลังโหลดแผนที่…
          </div>
        )}
        <button
          type="button"
          className="map-fullscreen-btn"
          onClick={() => setFullscreen((v) => !v)}
          aria-label={fullscreen ? 'ออกจากเต็มจอ' : 'ดูแผนที่เต็มจอ'}
        >
          {fullscreen ? 'ย่อหน้าต่าง' : 'เต็มจอ'}
        </button>
        <div ref={containerRef} className="maplibre-map" />
      </div>

      <aside className="panel-card flex flex-col gap-3 map-layout__aside overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-heading m-0 text-base">รายละเอียด</h2>
          {selectedProvince && (
            <button type="button" className="navbar__login text-xs py-1.5" onClick={reset}>
              ← ทั้งประเทศ
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 m-0">
          {selectedProvince ? `จังหวัด${selectedProvince}` : 'ภาพรวมประเทศ'} ·{' '}
          {geojson.features.length} จุดโรงเรียน
          {selectedScope ? ` · โฟกัส: ${selectedScope}` : ''}
        </p>
        <p className="text-xs text-slate-400 m-0">
          คลิกรายการด้านข้างเพื่อซูมแผนที่ · หรือคลิกจังหวัดบนแผนที่
        </p>

        {!selectedProvince ? (
          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
            <div className="text-xs font-semibold text-slate-500 mb-1">
              จังหวัดที่มีโรงเรียน ({provinceStats.length})
            </div>
            {provinceStats.map((p) => (
              <button
                type="button"
                key={p.name}
                ref={(el) => {
                  if (el) listRefs.current.set(p.name, el);
                  else listRefs.current.delete(p.name);
                }}
                className="rounded-xl border p-2.5 transition w-full text-left cursor-pointer"
                style={{
                  borderColor:
                    hoverProvince === p.name ? 'var(--tm-seafoam)' : 'var(--border)',
                  background: hoverProvince === p.name ? 'var(--tm-seafoam-50)' : '#fff',
                }}
                onMouseEnter={() => onProvinceRowEnter(p.name)}
                onMouseLeave={onProvinceRowLeave}
                onClick={() => selectProvinceFromSidebar(p.name)}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-tm-blue text-sm">{p.name}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {p.count.toLocaleString()} โรงเรียน
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                className={`navbar__link ${groupMode === 'district' ? 'navbar__link--active' : ''}`}
                onClick={() => {
                  setGroupMode('district');
                  setSelectedScope('');
                  setHoverDistrict(null);
                  setHoverKey(null);
                }}
              >
                ตามอำเภอ
              </button>
              <button
                type="button"
                className={`navbar__link ${groupMode === 'area' ? 'navbar__link--active' : ''}`}
                onClick={() => {
                  setGroupMode('area');
                  setSelectedScope('');
                  setHoverDistrict(null);
                  setHoverKey(null);
                }}
              >
                ตามเขตพื้นที่
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {groups.map((g) => {
                const isDistrictMode = groupMode === 'district';
                const active =
                  selectedScope === g.name ||
                  (isDistrictMode
                    ? hoverDistrict != null &&
                      normalizeDistrictLabel(hoverDistrict) ===
                        normalizeDistrictLabel(g.name)
                    : hoverKey === `group:${g.name}`);
                return (
                  <button
                    type="button"
                    key={g.name}
                    ref={(el) => {
                      const key = isDistrictMode ? `district:${g.name}` : `group:${g.name}`;
                      if (el) listRefs.current.set(key, el);
                      else listRefs.current.delete(key);
                    }}
                    className="rounded-xl border p-3 transition w-full text-left cursor-pointer"
                    style={{
                      borderColor: active ? '#ea580c' : 'var(--border)',
                      background: active ? '#fff7ed' : '#fff',
                      boxShadow: active ? '0 0 0 2px rgba(234, 88, 12, 0.35)' : undefined,
                    }}
                    onMouseEnter={() => {
                      if (isDistrictMode) onDistrictRowEnter(g.name);
                      else setHoverKey(`group:${g.name}`);
                    }}
                    onMouseLeave={() => {
                      if (isDistrictMode) onDistrictRowLeave();
                      else setHoverKey(selectedScope ? `group:${selectedScope}` : null);
                    }}
                    onClick={() => selectGroupFromSidebar(g.name)}
                  >
                    <div className="font-semibold text-tm-blue">{g.name}</div>
                    <div className="text-xs text-slate-500 mb-2">
                      {g.schools.length} โรงเรียน · นักเรียน {g.students.toLocaleString()}
                    </div>
                    <ul className="m-0 p-0 list-none space-y-1">
                      {g.schools.slice(0, 8).map((s) => (
                        <li
                          key={String(s.school_id)}
                          className="text-sm rounded px-1.5 py-0.5"
                          style={{
                            background:
                              hoverKey === String(s.school_id)
                                ? 'var(--tm-blue-50)'
                                : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setHoverKey(String(s.school_id));
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setHoverKey(`group:${g.name}`);
                          }}
                        >
                          • {formatSchoolLabel(s, groupMode)}
                        </li>
                      ))}
                      {g.schools.length > 8 && (
                        <li className="text-xs text-slate-400">
                          +{g.schools.length - 8} เพิ่มเติม
                        </li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
