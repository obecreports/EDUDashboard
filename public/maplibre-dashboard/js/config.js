/**
 * ConED MapLibre – namespaced config (safe beside legacy D3 map)
 */
export const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/**
 * Camera lock — generous padding around Thailand so fitBounds can zoom out
 * far enough to show Chiang Rai → Yala without truncation at any aspect ratio.
 */
export const THAILAND_MAX_BOUNDS = [
  [94.0, 3.2],
  [109.0, 23.0],
];

/** Full-country frame (Chiang Rai → Yala) used on init / reset */
export const THAILAND_FIT_BOUNDS = [
  [97.34, 5.61],
  [105.64, 20.46],
];

/** Lowest zoom users may reach when scrolling out within maxBounds */
export const MAP_MIN_ZOOM = 4.35;
export const MAP_MAX_ZOOM = 14;

export const NATIONAL_FIT_OPTIONS = {
  padding: { top: 56, bottom: 56, left: 56, right: 56 },
  duration: 0,
  essential: true,
  pitch: 0,
  bearing: 0,
  /** Cap so tall viewports don't over-zoom the country */
  maxZoom: 6.2,
};

export const NATIONAL_VIEW = {
  center: [101.0, 13.5],
  zoom: 5.0,
  pitch: 0,
  bearing: 0,
};

export const DATA_URLS = {
  provinces:
    'https://cdn.jsdelivr.net/gh/chingchai/OpenGISData-Thailand@master/provinces.geojson',
  districts:
    'https://cdn.jsdelivr.net/gh/chingchai/OpenGISData-Thailand@master/districts.geojson',
  schools: './data/schools.geojson',
  schoolsFallback: './data/schools.geojson',
};

export const USER_PROFILE = {
  user_id: 'u-demo-001',
  display_name: 'เจ้าหน้าที่เขตพื้นที่',
  assigned_zone_id: null,
  assigned_zone_code: null,
  assigned_province_th: null,
};

/** Prefixed IDs avoid collisions with any co-mounted map instance */
export const LAYER_IDS = {
  mask: 'coned-ml-thailand-mask',
  provinceFill: 'coned-ml-province-fill',
  provinceOutline: 'coned-ml-province-line',
  districtFill: 'coned-ml-district-fill',
  districtOutline: 'coned-ml-district-line',
  schoolsGlow: 'coned-ml-school-glow',
  schools: 'coned-ml-school-points',
};

export const SOURCE_IDS = {
  mask: 'coned-ml-mask',
  provinces: 'coned-ml-provinces',
  districts: 'coned-ml-districts',
  schools: 'coned-ml-school-points',
};

export const COLORS = {
  activeFill: '#38bdf8',
  activeHover: '#0ea5e9',
  activeSelected: '#0284c7',
  inactiveFill: '#cbd5e1',
  inactiveHover: '#94a3b8',
  mask: '#e2e8f0',
  school: '#e11d48',
  schoolHover: '#fbbf24',
  districtFill: '#fbbf24',
  districtHover: '#f59e0b',
};
