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

export function ThailandMapClient({ schools }: { schools: SchoolFull[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>('district');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const geojson = useMemo(() => schoolsToGeoJSON(schools), [schools]);

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
    return [...map.values()].sort((a, b) => b.schools.length - a.schools.length);
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
        fetch(PROVINCES_URL).then((r) => r.json()),
        fetch(DISTRICTS_URL).then((r) => r.json()),
      ]);

      // Hole-free mute panels (avoid geojson-vt hole artifacts)
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
            '#38bdf8',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.85,
            ['boolean', ['feature-state', 'dimmed'], false],
            0.2,
            0.45,
          ],
        },
      });
      map.addLayer({
        id: 'province-line',
        type: 'line',
        source: 'provinces',
        paint: { 'line-color': '#fff', 'line-width': 0.8 },
      });

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
            '#f59e0b',
            '#fbbf24',
          ],
          'fill-opacity': 0.4,
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

      // stash districts for filtering
      (map as any).__districts = districts;

      map.on('click', 'province-fill', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const name = String(f.properties?.pro_th || f.properties?.name_th || '');
        setSelectedProvince(name || null);
        const all = (map as any).__districts as GeoJSON.FeatureCollection;
        const code = String(f.properties?.pro_code ?? f.id ?? '');
        const filtered = {
          type: 'FeatureCollection' as const,
          features: (all.features || []).filter(
            (d) => String(d.properties?.pro_code ?? '').startsWith(code.slice(0, 2)) ||
              String(d.properties?.pro_th || '') === name
          ),
        };
        (map.getSource('districts') as GeoJSONSource).setData(filtered);
        map.setLayoutProperty('district-fill', 'visibility', 'visible');
        for (const pf of (provinces as GeoJSON.FeatureCollection).features) {
          const id = pf.properties?.pro_code ?? pf.id;
          if (id == null) continue;
          map.setFeatureState(
            { source: 'provinces', id },
            {
              selected: String(id) === String(f.id ?? f.properties?.pro_code),
              dimmed: String(id) !== String(f.id ?? f.properties?.pro_code),
              hover: false,
            }
          );
        }
        const bounds = new maplibregl.LngLatBounds();
        const coords = (f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).type === 'Polygon'
          ? (f.geometry as GeoJSON.Polygon).coordinates[0]
          : (f.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
        coords.forEach((c) => bounds.extend(c as [number, number]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 900 });
      });

      let hoveredProvince: string | number | null = null;
      map.on('mousemove', 'province-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features?.[0]?.id;
        if (id == null) return;
        if (hoveredProvince != null) {
          map.setFeatureState({ source: 'provinces', id: hoveredProvince }, { hover: false });
        }
        hoveredProvince = id;
        map.setFeatureState({ source: 'provinces', id }, { hover: true });
      });
      map.on('mouseleave', 'province-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredProvince != null) {
          map.setFeatureState({ source: 'provinces', id: hoveredProvince }, { hover: false });
          hoveredProvince = null;
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
    if (!map || !ready) return;
    const src = map.getSource('schools') as GeoJSONSource | undefined;
    src?.setData(geojson);
  }, [geojson, ready]);

  // Panel → map hover sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const f of geojson.features) {
      const id = String(f.properties.school_id);
      map.setFeatureState(
        { source: 'schools', id },
        { hover: hoverKey === id || hoverKey === `group:${f.properties.district}` || hoverKey === `group:${f.properties.area_name}` }
      );
    }
  }, [hoverKey, ready, geojson]);

  const reset = () => {
    const map = mapRef.current;
    if (!map) return;
    setSelectedProvince(null);
    map.setLayoutProperty('district-fill', 'visibility', 'none');
    (map.getSource('districts') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [],
    });
    map.fitBounds(FIT, { padding: 48, duration: 800, maxZoom: 6.2 });
  };

  return (
    <div className="map-layout">
      <div className="relative panel-card p-0 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 text-tm-blue font-medium">
            กำลังโหลดแผนที่…
          </div>
        )}
        <div ref={containerRef} className="maplibre-map" />
      </div>

      <aside className="panel-card flex flex-col gap-3 max-h-[calc(100vh-140px)] overflow-hidden">
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
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            className={`navbar__link ${groupMode === 'district' ? 'navbar__link--active' : ''}`}
            onClick={() => setGroupMode('district')}
          >
            ตามอำเภอ
          </button>
          <button
            type="button"
            className={`navbar__link ${groupMode === 'area' ? 'navbar__link--active' : ''}`}
            onClick={() => setGroupMode('area')}
          >
            ตามเขตพื้นที่
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {groups.map((g) => (
            <div
              key={g.name}
              className="rounded-xl border p-3 transition"
              style={{
                borderColor: hoverKey === `group:${g.name}` ? '#00c6a0' : 'var(--border)',
                background: hoverKey === `group:${g.name}` ? 'var(--tm-seafoam-50)' : '#fff',
              }}
              onMouseEnter={() => setHoverKey(`group:${g.name}`)}
              onMouseLeave={() => setHoverKey(null)}
            >
              <div className="font-semibold text-tm-blue">{g.name}</div>
              <div className="text-xs text-slate-500 mb-2">
                {g.schools.length} โรงเรียน · นักเรียน {g.students.toLocaleString()}
              </div>
              <ul className="m-0 p-0 list-none space-y-1">
                {g.schools.slice(0, 8).map((s) => (
                  <li
                    key={String(s.school_id)}
                    className="text-sm truncate rounded px-1.5 py-0.5"
                    style={{
                      background:
                        hoverKey === String(s.school_id) ? 'var(--tm-blue-50)' : 'transparent',
                    }}
                    onMouseEnter={() => setHoverKey(String(s.school_id))}
                    onMouseLeave={() => setHoverKey(`group:${g.name}`)}
                  >
                    • {s.school_name_th}
                  </li>
                ))}
                {g.schools.length > 8 && (
                  <li className="text-xs text-slate-400">+{g.schools.length - 8} เพิ่มเติม</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
