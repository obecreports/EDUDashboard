/**
 * ConED MapLibre controller — Thailand-scoped, DB-driven, hover-synced
 */
import maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm';
import {
  MAP_STYLE,
  NATIONAL_VIEW,
  NATIONAL_FIT_OPTIONS,
  THAILAND_FIT_BOUNDS,
  THAILAND_MAX_BOUNDS,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  DATA_URLS,
  LAYER_IDS,
  SOURCE_IDS,
} from './config.js';
import {
  loadGeoJSON,
  normalizeProvinces,
  normalizeDistricts,
  indexDistrictsByProvince,
} from './geojson-loader.js';
import {
  addAdminBoundaryLayers,
  fitMapToPolygon,
  bindPolygonHover,
  applyActiveProvinceStates,
} from './boundary-layers.js';
import {
  loadAndBindSchools,
  setSchoolMapFilter,
  setSchoolLayersVisibility,
  buildProvinceNameToCodeMap,
} from './schools-api.js';

export class ConEDMapController {
  /**
   * @param {HTMLElement} container
   * @param {object} [options]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      maxWidth: '300px',
      className: 'coned-ml-popup',
    });

    this.level = 'country';
    this.selectedProvinceId = null;
    this.selectedDistrictId = null;

    this._cache = {
      provinces: null,
      districts: null,
      schoolsGeoJSON: null,
      provinceStats: new Map(),
    };
    this._activeProvinceIds = new Set();
    this._glowSchoolIds = new Set();
    this._districtIndex = null;
    this._provinceNameToCode = null;
    this._visibleSchoolFeatures = [];
    this._hoverBridge = null;

    this._onSelectionChange = options.onSelectionChange || (() => {});
    this._onReady = options.onReady || (() => {});

    this.map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: NATIONAL_VIEW.center,
      zoom: NATIONAL_VIEW.zoom,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      pitch: 0,
      bearing: 0,
      maxBounds: THAILAND_MAX_BOUNDS,
      attributionControl: false,
      antialias: true,
      renderWorldCopies: false,
    });

    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    this.map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Boundaries © OpenGISData-Thailand',
      }),
      'bottom-right'
    );

    this.map.on('load', () => {
      this.map.resize();
      this._fitNationalView({ animate: false });
      this._bootstrap();
    });

    // Re-frame full country if the iframe/container size changes
    this.map.on('resize', () => {
      if (this.level === 'country') {
        this._fitNationalView({ animate: false });
      }
    });
  }

  /** Fit entire Thailand in viewport; used on init and national reset. */
  _fitNationalView({ animate = true } = {}) {
    this.map.fitBounds(THAILAND_FIT_BOUNDS, {
      ...NATIONAL_FIT_OPTIONS,
      duration: animate ? 1000 : 0,
      // Ensure fit is not blocked by a too-tight maxBounds interaction
      linear: false,
    });
  }

  attachHoverBridge(bridge) {
    this._hoverBridge = bridge;
  }

  async _bootstrap() {
    const [rawProvinces, rawDistricts] = await Promise.all([
      loadGeoJSON(DATA_URLS.provinces),
      loadGeoJSON(DATA_URLS.districts),
    ]);

    const provinces = normalizeProvinces(rawProvinces);
    const districts = normalizeDistricts(rawDistricts);

    this._cache.provinces = provinces;
    this._cache.districts = districts;
    this._districtIndex = indexDistrictsByProvince(districts);
    this._provinceNameToCode = buildProvinceNameToCodeMap(provinces);

    addAdminBoundaryLayers(this.map, {
      provinces,
      maskSourceId: SOURCE_IDS.mask,
      maskLayerId: LAYER_IDS.mask,
      provinceSourceId: SOURCE_IDS.provinces,
      districtSourceId: SOURCE_IDS.districts,
      provinceFillId: LAYER_IDS.provinceFill,
      provinceLineId: LAYER_IDS.provinceOutline,
      districtFillId: LAYER_IDS.districtFill,
      districtLineId: LAYER_IDS.districtOutline,
    });

    let schoolsSource = 'fallback';
    try {
      const geojson = await loadAndBindSchools(this.map, {
        provinceNameToCode: this._provinceNameToCode,
      });
      this._cache.schoolsGeoJSON = geojson;
      schoolsSource = 'database';
    } catch (err) {
      console.error('[ConED MapLibre] School load failed:', err);
      this._cache.schoolsGeoJSON = { type: 'FeatureCollection', features: [] };
    }

    this._rebuildProvinceStats();
    this._applyActiveProvinceHighlight();
    this._bindInteractions();

    this._onReady({
      provinceStats: this._cache.provinceStats,
      schoolCount: this._cache.schoolsGeoJSON.features.length,
      schoolsSource,
      provinces: this._cache.provinces,
    });

    this._onSelectionChange({
      type: 'ready',
      provinceStats: this._cache.provinceStats,
      schools: this._cache.schoolsGeoJSON,
    });
  }

  /**
   * Aggregate like legacy ThailandMap: districts + educational areas per province.
   */
  _rebuildProvinceStats() {
    const stats = new Map();

    for (const f of this._cache.schoolsGeoJSON?.features || []) {
      const p = f.properties || {};
      const name = (p.province || p.province_name_th || '').trim() || 'ไม่ระบุ';
      const pid = String(p.province_id || this._provinceNameToCode?.get(name) || '');
      const key = pid || name;

      if (!stats.has(key)) {
        stats.set(key, {
          provinceId: pid,
          provinceName: name,
          schools: 0,
          students: 0,
          personnel: 0,
          areasCount: 0,
          districts: new Map(),
          areas: new Map(),
        });
      }

      const row = stats.get(key);
      const students = Number(p.student_count ?? p.students ?? 0);
      const personnel = Number(p.staff_assigned ?? p.personnel ?? 0);

      row.schools += 1;
      row.students += students;
      row.personnel += personnel;

      const schoolItem = {
        school_id: String(p.school_id || p.id),
        school_name_th: p.school_name_th || p.school_name || 'ไม่ระบุชื่อโรงเรียน',
        school_name: p.school_name || p.school_name_th,
        students,
        personnel,
        student_count: students,
        staff_assigned: personnel,
        district: (p.district || p.district_name_th || '').trim(),
        area_id: String(p.area_id || p.zone_id || ''),
        area_name: p.area_name || '',
        area_key: String(p.area_key || p.area_id || p.zone_id || p.area_name || ''),
        zone_id: String(p.zone_id || p.area_id || ''),
        province: name,
        province_id: pid,
        school_size: p.school_size || '',
        director_name: p.director_name || '',
        assigned_staff_id: p.assigned_staff_id || '',
      };

      const dist = schoolItem.district || 'ไม่ระบุ';
      if (!row.districts.has(dist)) {
        row.districts.set(dist, {
          name: dist,
          districtName: dist,
          schools: [],
          students: 0,
          personnel: 0,
          totalStudents: 0,
          totalPersonnel: 0,
        });
      }
      const d = row.districts.get(dist);
      d.schools.push(schoolItem);
      d.students += students;
      d.personnel += personnel;
      d.totalStudents = d.students;
      d.totalPersonnel = d.personnel;

      const areaKey = schoolItem.area_key || 'ไม่ระบุเขตพื้นที่';
      const areaName =
        schoolItem.area_name ||
        (schoolItem.area_id ? `เขตพื้นที่ ${schoolItem.area_id}` : 'ไม่ระบุเขตพื้นที่');
      if (!row.areas.has(areaKey)) {
        row.areas.set(areaKey, {
          areaId: schoolItem.area_id,
          areaKey,
          areaName,
          name: areaName,
          schools: [],
          students: 0,
          personnel: 0,
          totalStudents: 0,
          totalPersonnel: 0,
        });
      }
      const a = row.areas.get(areaKey);
      a.schools.push(schoolItem);
      a.students += students;
      a.personnel += personnel;
      a.totalStudents = a.students;
      a.totalPersonnel = a.personnel;
    }

    for (const row of stats.values()) {
      row.areasCount = [...row.areas.keys()].filter((k) => k !== 'ไม่ระบุเขตพื้นที่').length;
    }

    this._cache.provinceStats = stats;
  }

  _applyActiveProvinceHighlight() {
    const activeIds = new Set();
    for (const row of this._cache.provinceStats.values()) {
      if (row.provinceId) activeIds.add(String(row.provinceId));
    }
    for (const f of this._cache.provinces.features) {
      const th = f.properties.zone_name_th;
      const id = String(f.properties.zone_id);
      for (const row of this._cache.provinceStats.values()) {
        if (row.provinceName === th) activeIds.add(id);
      }
    }
    this._activeProvinceIds = activeIds;
    applyActiveProvinceStates(
      this.map,
      SOURCE_IDS.provinces,
      this._cache.provinces,
      activeIds
    );
  }

  _bindInteractions() {
    const { map } = this;

    bindPolygonHover(map, LAYER_IDS.provinceFill, SOURCE_IDS.provinces, {
      // Allow hover on other provinces even while zoomed into one
      isActive: () => true,
      onEnter: (feature, e) => {
        const p = feature.properties;
        const stats = this._statsForProvince(p.zone_id, p.zone_name_th);
        this._showPopup(
          e.lngLat,
          `<div class="coned-ml-tip">
            <strong>${p.zone_name_th}</strong>
            <div class="muted">${p.zone_name_en || ''}</div>
            ${
              stats
                ? `<hr class="coned-ml-tip-hr"/>
                   <div>โรงเรียน: <b>${stats.schools}</b></div>
                   <div>เขตพื้นที่: <b>${stats.areasCount}</b></div>
                   <div>นักเรียน: <b>${stats.students.toLocaleString()}</b></div>
                   <div>บุคลากร: <b>${stats.personnel.toLocaleString()}</b></div>`
                : `<div class="muted">ไม่มีโรงเรียนในสังกัด</div>`
            }
          </div>`
        );
      },
      onLeave: () => this.popup.remove(),
    });

    map.on('click', LAYER_IDS.provinceFill, (e) => {
      if (!e.features?.length) return;
      const f = e.features[0];
      const id = String(f.properties.zone_id);
      // Allow switching provinces while zoomed; ignore re-click on current
      if (id === String(this.selectedProvinceId || '')) return;
      const stats = this._statsForProvince(f.properties.zone_id, f.properties.zone_name_th);
      if (!stats || stats.schools === 0) return;
      this.drillIntoProvince(f);
    });

    // District map hover → panel sync via hover bridge
    map.on('mousemove', LAYER_IDS.districtFill, (e) => {
      if (!(this.level === 'province' || this.level === 'district')) return;
      if (!e.features?.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      const name = f.properties.district_name_th;
      this._hoverBridge?.onMapDistrictEnter(f.id, name, f.properties, e.lngLat);
    });

    map.on('mouseleave', LAYER_IDS.districtFill, () => {
      map.getCanvas().style.cursor = '';
      this._hoverBridge?.onMapDistrictLeave();
    });

    map.on('click', LAYER_IDS.districtFill, (e) => {
      if (!e.features?.length) return;
      e.originalEvent.stopPropagation();
      this.zoomToDistrict(e.features[0]);
    });

    map.on('mousemove', LAYER_IDS.schools, (e) => {
      if (!e.features?.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      this._hoverBridge?.onMapSchoolEnter(f.id, f.properties);
    });

    map.on('mouseleave', LAYER_IDS.schools, () => {
      map.getCanvas().style.cursor = '';
      this._hoverBridge?.onMapSchoolLeave();
    });

    map.on('click', LAYER_IDS.schools, (e) => {
      if (!e.features?.length) return;
      e.originalEvent.stopPropagation();
      this._onSelectionChange({ type: 'school', properties: e.features[0].properties });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Feature-state hover / glow API (used by HoverBridge)                 */
  /* ------------------------------------------------------------------ */

  setSchoolGlow(schoolIds, { pulse = true } = {}) {
    this.clearSchoolGlow();
    for (const id of schoolIds) {
      const sid = String(id);
      this._glowSchoolIds.add(sid);
      this.map.setFeatureState(
        { source: SOURCE_IDS.schools, id: sid },
        { glow: true, hover: pulse }
      );
    }
  }

  clearSchoolGlow() {
    for (const id of this._glowSchoolIds) {
      this.map.setFeatureState(
        { source: SOURCE_IDS.schools, id },
        { glow: false, hover: false }
      );
    }
    this._glowSchoolIds.clear();
  }

  setDistrictHover(districtId, on) {
    if (districtId == null) return;
    this.map.setFeatureState(
      { source: SOURCE_IDS.districts, id: districtId },
      { hover: Boolean(on) }
    );
  }

  /**
   * Find amphoe feature(s) matching a school district name and highlight them.
   * @returns {{ districtId: string|null, schoolIds: string[] }}
   */
  highlightDistrictByName(districtName, { glowSchools = true } = {}) {
    const name = String(districtName || '').trim();
    let districtId = null;

    const features = this.map.querySourceFeatures(SOURCE_IDS.districts) || [];
    // Prefer loaded source data (querySourceFeatures can be empty at some zooms)
    const fromCache =
      this._districtIndex.get(String(this.selectedProvinceId)) || [];

    const match =
      fromCache.find((f) => namesMatch(f.properties.district_name_th, name)) ||
      features.find((f) => namesMatch(f.properties?.district_name_th, name));

    if (match) {
      districtId = match.id ?? match.properties.district_id;
      this.setDistrictHover(districtId, true);
    }

    const schoolIds = glowSchools ? this.glowSchoolsByDistrictName(name) : [];
    return { districtId, schoolIds };
  }

  glowSchoolsByDistrictName(districtName) {
    const name = String(districtName || '').trim();
    const ids = [];
    for (const f of this._visibleSchoolFeatures) {
      const d = (f.properties?.district || f.properties?.district_name_th || '').trim();
      if (namesMatch(d, name)) {
        ids.push(String(f.properties.school_id || f.id));
      }
    }
    this.setSchoolGlow(ids);
    return ids;
  }

  highlightAreaSchools(areaKey) {
    const key = String(areaKey || '');
    const ids = [];
    for (const f of this._visibleSchoolFeatures) {
      const p = f.properties || {};
      const k = String(p.area_key || p.area_id || p.zone_id || '');
      if (k === key) ids.push(String(p.school_id || f.id));
    }
    this.setSchoolGlow(ids);
    return ids;
  }

  showSchoolTooltip(p) {
    if (!p) return;
    const lng = Number(p.lng ?? p.long);
    const lat = Number(p.lat);
    // Prefer feature coordinates from visible set
    const feat = this._visibleSchoolFeatures.find(
      (f) => String(f.properties?.school_id || f.id) === String(p.school_id || p.id)
    );
    const coords = feat?.geometry?.coordinates;
    const lngLat = coords
      ? { lng: coords[0], lat: coords[1] }
      : Number.isFinite(lng) && Number.isFinite(lat)
        ? { lng, lat }
        : null;
    if (!lngLat) return;

    this._showPopup(
      lngLat,
      `<div class="coned-ml-tip">
        <strong>${p.school_name_th || p.school_name || 'โรงเรียน'}</strong>
        <div class="muted">อ.${p.district || p.district_name_th || '—'} · ${p.area_name || p.zone_id || '—'}</div>
        <hr class="coned-ml-tip-hr"/>
        <div>นักเรียน: <b>${Number(p.student_count || p.students || 0).toLocaleString()}</b></div>
        <div>บุคลากร: <b>${Number(p.staff_assigned || p.personnel || 0).toLocaleString()}</b></div>
        ${p.school_size ? `<div>ขนาด: <b>${p.school_size}</b></div>` : ''}
      </div>`
    );
  }

  showDistrictTooltip(p, lngLat) {
    if (!p || !lngLat) return;
    this._showPopup(
      lngLat,
      `<div class="coned-ml-tip"><strong>อ.${p.district_name_th}</strong>
        <div class="muted">จ.${p.province_name_th || ''}</div>
        <div class="muted" style="margin-top:0.25rem">วางเมาส์บนรายการด้านขวาเพื่อไฮไลต์อำเภอ</div>
      </div>`
    );
  }

  hideTooltip() {
    this.popup.remove();
  }

  _statsForProvince(provinceId, provinceName) {
    const id = String(provinceId || '');
    if (this._cache.provinceStats.has(id)) return this._cache.provinceStats.get(id);
    for (const row of this._cache.provinceStats.values()) {
      if (row.provinceName === provinceName || row.provinceId === id) return row;
    }
    return null;
  }

  _showPopup(lngLat, html) {
    this.popup.setLngLat(lngLat).setHTML(html).addTo(this.map);
  }

  drillIntoProvince(feature) {
    const props = feature.properties;
    const provinceId = String(props.zone_id);
    const provinceName = props.zone_name_th;

    this.level = 'province';
    this.selectedProvinceId = provinceId;
    this.selectedDistrictId = null;
    this.clearSchoolGlow();
    this.popup.remove();

    for (const f of this._cache.provinces.features) {
      const id = String(f.properties.zone_id);
      this.map.setFeatureState(
        { source: SOURCE_IDS.provinces, id },
        {
          selected: id === provinceId,
          dimmed: id !== provinceId,
          hasData: this._activeProvinceIds.has(id),
          hover: false,
        }
      );
    }

    const districtFeatures = this._districtIndex.get(provinceId) || [];
    this.map.getSource(SOURCE_IDS.districts).setData({
      type: 'FeatureCollection',
      features: districtFeatures,
    });
    this.map.setLayoutProperty(LAYER_IDS.districtFill, 'visibility', 'visible');
    this.map.setLayoutProperty(LAYER_IDS.districtOutline, 'visibility', 'visible');

    const schoolFeatures = (this._cache.schoolsGeoJSON?.features || []).filter(
      (f) =>
        String(f.properties?.province_id) === provinceId ||
        f.properties?.province === provinceName ||
        f.properties?.province_name_th === provinceName
    );
    this._visibleSchoolFeatures = schoolFeatures;

    setSchoolMapFilter(this.map, [
      'any',
      ['==', ['to-string', ['get', 'province_id']], provinceId],
      ['==', ['get', 'province'], provinceName],
      ['==', ['get', 'province_name_th'], provinceName],
    ]);
    setSchoolLayersVisibility(this.map, true);

    fitMapToPolygon(this.map, feature, { maxZoom: 9.2, duration: 1100 });

    const stats = this._statsForProvince(provinceId, provinceName);
    this._onSelectionChange({
      type: 'province',
      properties: props,
      stats,
      districts: { type: 'FeatureCollection', features: districtFeatures },
      schools: { type: 'FeatureCollection', features: schoolFeatures },
    });
  }

  zoomToDistrict(feature) {
    const props = feature.properties;
    const districtId = String(props.district_id);

    if (this.selectedDistrictId != null) {
      this.map.setFeatureState(
        { source: SOURCE_IDS.districts, id: this.selectedDistrictId },
        { selected: false }
      );
    }

    this.level = 'district';
    this.selectedDistrictId = districtId;
    this.map.setFeatureState(
      { source: SOURCE_IDS.districts, id: districtId },
      { selected: true, hover: false }
    );
    this.popup.remove();

    fitMapToPolygon(this.map, feature, {
      padding: 72,
      duration: 900,
      maxZoom: 12,
    });

    this._onSelectionChange({ type: 'district', properties: props });
  }

  resetView() {
    this.level = 'country';
    this.selectedProvinceId = null;
    this.selectedDistrictId = null;
    this.clearSchoolGlow();
    this._visibleSchoolFeatures = [];
    this.popup.remove();
    this._hoverBridge?.clearAll();

    this._applyActiveProvinceHighlight();

    this.map.getSource(SOURCE_IDS.districts).setData({
      type: 'FeatureCollection',
      features: [],
    });
    this.map.setLayoutProperty(LAYER_IDS.districtFill, 'visibility', 'none');
    this.map.setLayoutProperty(LAYER_IDS.districtOutline, 'visibility', 'none');
    setSchoolLayersVisibility(this.map, false);
    setSchoolMapFilter(this.map, null);

    this._fitNationalView({ animate: true });

    this._onSelectionChange({
      type: 'reset',
      provinceStats: this._cache.provinceStats,
      schools: this._cache.schoolsGeoJSON,
    });
  }

  selectProvinceByName(thaiName) {
    const feature = this._cache.provinces.features.find(
      (f) => f.properties.zone_name_th === thaiName
    );
    if (!feature) return;
    const stats = this._statsForProvince(feature.properties.zone_id, thaiName);
    if (!stats || stats.schools === 0) return;
    this.drillIntoProvince(feature);
  }

  resize() {
    this.map?.resize();
  }
}

/** Fuzzy Thai district name match (เมือง ↔ เมืองขอนแก่น) */
function namesMatch(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}
