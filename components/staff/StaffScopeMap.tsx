'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SchoolFull } from '@/lib/types';

const PROVINCES_URL =
  'https://cdn.jsdelivr.net/gh/chingchai/OpenGISData-Thailand@master/provinces.geojson';

const FIT: [[number, number], [number, number]] = [
  [97.34, 5.61],
  [105.64, 20.46],
];
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [94.0, 3.2],
  [109.0, 23.0],
];

type ProvinceFC = GeoJSON.FeatureCollection;

function provinceName(f: GeoJSON.Feature): string {
  return String(f.properties?.pro_th || f.properties?.name_th || f.properties?.name || '');
}

function provinceId(f: GeoJSON.Feature): string | number | null {
  const id = f.properties?.pro_code ?? f.id;
  return id == null ? null : (id as string | number);
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

type Props = {
  schools: SchoolFull[];
  height?: number;
};

export function StaffScopeMap({ schools, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const provincesRef = useRef<ProvinceFC | null>(null);
  const [ready, setReady] = useState(false);

  const scopedProvinceNames = useMemo(() => {
    const set = new Set<string>();
    schools.forEach((s) => {
      if (s.province?.trim()) set.add(s.province.trim());
    });
    return set;
  }, [schools]);

  const points = useMemo(() => {
    const features: GeoJSON.Feature[] = [];
    for (const s of schools) {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue;
      features.push({
        type: 'Feature',
        properties: {
          id: String(s.school_id),
          name: s.school_name_th,
          area: s.area_name || s.area_id || '',
          province: s.province || '',
          score: s.overallScore ?? 0,
        },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
    }
    return { type: 'FeatureCollection' as const, features };
  }, [schools]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [101, 13.5],
      zoom: 5,
      minZoom: 4.35,
      maxZoom: 12,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
      antialias: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', async () => {
      sanitizeBasemap(map);
      map.fitBounds(FIT, {
        padding: { top: 36, bottom: 36, left: 36, right: 36 },
        duration: 0,
        maxZoom: 6.2,
      });

      const provinces = (await fetch(PROVINCES_URL).then((r) => r.json())) as ProvinceFC;
      provincesRef.current = provinces;

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
            ['boolean', ['feature-state', 'inScope'], false],
            '#0d9488',
            '#cbd5e1',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'inScope'], false],
            0.55,
            0.28,
          ],
        },
      });

      map.addLayer({
        id: 'province-line',
        type: 'line',
        source: 'provinces',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'inScope'], false],
            '#0f766e',
            '#94a3b8',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'inScope'], false],
            1.4,
            0.6,
          ],
        },
      });

      map.addSource('staff-schools', { type: 'geojson', data: points });
      map.addLayer({
        id: 'staff-schools-circle',
        type: 'circle',
        source: 'staff-schools',
        paint: {
          'circle-radius': 7,
          'circle-color': '#00c6a0',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      map.on('mouseenter', 'staff-schools-circle', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f || f.geometry.type !== 'Point') return;
        const coords = f.geometry.coordinates.slice() as [number, number];
        const name = String(f.properties?.name || '');
        const area = String(f.properties?.area || '');
        popup
          .setLngLat(coords)
          .setHTML(
            `<strong style="font-size:13px">${name}</strong>${
              area ? `<div style="font-size:12px;opacity:.8">${area}</div>` : ''
            }`
          )
          .addTo(map);
      });
      map.on('mouseleave', 'staff-schools-circle', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const provinces = provincesRef.current;
    if (!map || !ready || !provinces) return;

    for (const f of provinces.features) {
      const id = provinceId(f);
      if (id == null) continue;
      const name = provinceName(f).trim();
      const inScope = scopedProvinceNames.has(name);
      map.setFeatureState({ source: 'provinces', id }, { inScope });
    }

    const src = map.getSource('staff-schools') as GeoJSONSource | undefined;
    src?.setData(points);
  }, [points, ready, scopedProvinceNames]);

  if (schools.length === 0) {
    return (
      <div className="staff-scope-map staff-scope-map--empty" style={{ height }}>
        ไม่มีโรงเรียนภายใต้ความรับผิดชอบ
      </div>
    );
  }

  return (
    <div className="staff-scope-map panel-card p-0 overflow-hidden" style={{ height }}>
      <div
        ref={containerRef}
        className="staff-scope-map__canvas"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
