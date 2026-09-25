/**
 * Thailand admin boundaries + national mute for MapLibre.
 *
 * IMPORTANT: Do NOT use a single Polygon-with-holes "world minus Thailand" GeoJSON
 * fill. geojson-vt tiles that geometry and produces rectangular shadow artifacts that
 * shift on zoom (MapLibre #4367 / #4322). Highlighting uses province/district features only.
 */
import { COLORS, THAILAND_MAX_BOUNDS } from './config.js';

export function getFeatureBounds(geo) {
  const features = geo?.type === 'FeatureCollection' ? geo.features : [geo];
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

export function fitMapToPolygon(map, feature, opts = {}) {
  const bounds = getFeatureBounds(feature);
  if (!bounds) return;
  map.fitBounds(bounds, {
    padding: opts.padding ?? { top: 56, bottom: 56, left: 56, right: 56 },
    duration: opts.duration ?? 1100,
    essential: true,
    maxZoom: opts.maxZoom ?? 12,
    ...opts,
  });
}

/**
 * Inverted national mute as a single hole-free MultiPolygon (world frame minus
 * the Thailand camera rectangle).
 *
 * We deliberately avoid "Polygon with Thailand rings as holes": geojson-vt
 * slices those into tile boxes and paints rectangular translucent artifacts
 * that shift on zoom (MapLibre #4367). Solid panel rings never overlay
 * province interiors — highlighting stays on province/district GeoJSON only.
 */
export function buildOutsideThailandMask(_provincesFc) {
  const [[west, south], [east, north]] = THAILAND_MAX_BOUNDS;
  // Slightly inset so panels never overlap province coastlines inside maxBounds
  const inset = 0.02;
  const minX = west + inset;
  const maxX = east - inset;
  const minY = south + inset;
  const maxY = north - inset;

  // Outer extent beyond maxBounds (still drawn if camera overshoots / padding)
  const W = west - 4;
  const E = east + 4;
  const S = south - 4;
  const N = north + 4;

  // MultiPolygon parts: each ring is a closed exterior (no holes)
  const coordinates = [
    // west
    [
      [
        [W, S],
        [minX, S],
        [minX, N],
        [W, N],
        [W, S],
      ],
    ],
    // east
    [
      [
        [maxX, S],
        [E, S],
        [E, N],
        [maxX, N],
        [maxX, S],
      ],
    ],
    // south
    [
      [
        [minX, S],
        [maxX, S],
        [maxX, minY],
        [minX, minY],
        [minX, S],
      ],
    ],
    // north
    [
      [
        [minX, maxY],
        [maxX, maxY],
        [maxX, N],
        [minX, N],
        [minX, maxY],
      ],
    ],
  ];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { role: 'thailand-mask' },
        geometry: { type: 'MultiPolygon', coordinates },
      },
    ],
  };
}

/**
 * Disable hillshade / all basemap text labels, and soft-mute basemap fills so
 * neighbor countries inside the Thailand frame do not compete with province fills.
 * Call once after style load, before adding ConED layers.
 * ConED custom layers (province / district / school) are added afterward and stay intact.
 */
export function sanitizeBasemapStyle(map) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const id = layer.id;
    try {
      // Hide every basemap label (country, capital, settlement, road names, etc.)
      if (layer.type === 'symbol') {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }
      if (layer.type === 'hillshade') {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }
      if (layer.type === 'background') {
        map.setPaintProperty(id, 'background-color', COLORS.mask);
        continue;
      }
      // Soft-mute basemap land/water so only GeoJSON provinces read as active
      if (layer.type === 'fill') {
        const opacity = map.getPaintProperty(id, 'fill-opacity');
        if (opacity === undefined || typeof opacity === 'number') {
          map.setPaintProperty(id, 'fill-opacity', Math.min(0.22, opacity ?? 0.22));
        } else {
          map.setPaintProperty(id, 'fill-opacity', 0.18);
        }
      }
      if (layer.type === 'line') {
        const opacity = map.getPaintProperty(id, 'line-opacity');
        if (opacity === undefined || typeof opacity === 'number') {
          map.setPaintProperty(id, 'line-opacity', Math.min(0.25, opacity ?? 0.25));
        }
      }
    } catch {
      /* ignore paint props that don't apply to this layer */
    }
  }
}

/**
 * Add Thailand frame mute + province/district fill & line layers.
 * Province fill uses feature-state: hasData / hover / selected / dimmed
 */
export function addAdminBoundaryLayers(map, options) {
  const {
    provinces,
    maskSourceId,
    maskLayerId,
    provinceSourceId,
    districtSourceId,
    provinceFillId,
    provinceLineId,
    districtFillId,
    districtLineId,
  } = options;

  sanitizeBasemapStyle(map);

  // --- Frame mute (hole-free solid panels; never overlays province interiors) ---
  map.addSource(maskSourceId, {
    type: 'geojson',
    data: buildOutsideThailandMask(provinces),
    tolerance: 0,
    maxzoom: 12,
    buffer: 64,
  });

  map.addLayer({
    id: maskLayerId,
    type: 'fill',
    source: maskSourceId,
    paint: {
      'fill-color': COLORS.mask,
      'fill-opacity': 0.92,
      'fill-antialias': true,
    },
  });

  // --- Provinces (exact GeoJSON features — highlighting lives only here) ---
  map.addSource(provinceSourceId, {
    type: 'geojson',
    data: provinces,
    promoteId: 'zone_id',
    tolerance: 0,
    maxzoom: 12,
    buffer: 128,
  });

  map.addLayer({
    id: provinceFillId,
    type: 'fill',
    source: provinceSourceId,
    paint: {
      'fill-antialias': true,
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        COLORS.activeSelected,
        ['boolean', ['feature-state', 'hover'], false],
        [
          'case',
          ['boolean', ['feature-state', 'hasData'], false],
          COLORS.activeHover,
          COLORS.inactiveHover,
        ],
        ['boolean', ['feature-state', 'hasData'], false],
        COLORS.activeFill,
        COLORS.inactiveFill,
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.88,
        ['boolean', ['feature-state', 'dimmed'], false],
        0.22,
        ['boolean', ['feature-state', 'hasData'], false],
        0.62,
        0.35,
      ],
    },
  });

  map.addLayer({
    id: provinceLineId,
    type: 'line',
    source: provinceSourceId,
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#0c4a6e',
        ['boolean', ['feature-state', 'hasData'], false],
        '#ffffff',
        '#94a3b8',
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        2.4,
        ['boolean', ['feature-state', 'hover'], false],
        1.6,
        0.7,
      ],
      'line-opacity': 0.9,
    },
  });

  // --- Districts (lazy data) ---
  map.addSource(districtSourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    promoteId: 'district_id',
    tolerance: 0,
    maxzoom: 14,
    buffer: 128,
  });

  map.addLayer({
    id: districtFillId,
    type: 'fill',
    source: districtSourceId,
    layout: { visibility: 'none' },
    paint: {
      'fill-antialias': true,
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        COLORS.districtHover,
        COLORS.districtFill,
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.62,
        ['boolean', ['feature-state', 'selected'], false],
        0.5,
        0.28,
      ],
    },
  });

  map.addLayer({
    id: districtLineId,
    type: 'line',
    source: districtSourceId,
    layout: { visibility: 'none' },
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#b45309',
        ['boolean', ['feature-state', 'selected'], false],
        '#92400e',
        '#a16207',
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        3.2,
        ['boolean', ['feature-state', 'selected'], false],
        2.4,
        1.1,
      ],
      'line-opacity': 0.95,
    },
  });
}

export function bindPolygonHover(map, fillLayerId, sourceId, handlers = {}) {
  let hoveredId = null;

  map.on('mousemove', fillLayerId, (e) => {
    if (handlers.isActive && !handlers.isActive()) return;
    if (!e.features?.length) return;
    map.getCanvas().style.cursor = 'pointer';
    const id = e.features[0].id;
    if (hoveredId !== id) {
      if (hoveredId != null) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      }
      hoveredId = id;
      map.setFeatureState({ source: sourceId, id }, { hover: true });
    }
    handlers.onEnter?.(e.features[0], e);
  });

  map.on('mouseleave', fillLayerId, () => {
    map.getCanvas().style.cursor = '';
    if (hoveredId != null) {
      map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      hoveredId = null;
    }
    handlers.onLeave?.();
  });
}

/**
 * Mark provinces that have managed schools (hasData) vs muted inactive.
 * @param {import('maplibre-gl').Map} map
 * @param {string} sourceId
 * @param {GeoJSON.FeatureCollection} provinces
 * @param {Set<string>} activeProvinceIds  zone_id / pro_code set
 */
export function applyActiveProvinceStates(map, sourceId, provinces, activeProvinceIds) {
  for (const f of provinces.features || []) {
    const id = String(f.properties?.zone_id ?? f.id);
    const hasData = activeProvinceIds.has(id);
    map.setFeatureState(
      { source: sourceId, id },
      { hasData, dimmed: false, selected: false, hover: false }
    );
  }
}
