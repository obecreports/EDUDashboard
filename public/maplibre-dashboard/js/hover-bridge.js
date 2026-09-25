/**
 * Bidirectional hover sync between detail panel DOM and MapLibre feature-state.
 * Uses setFeatureState only — no setData / layer rebuilds on hover.
 */
import { LAYER_IDS, SOURCE_IDS } from './config.js';

export class HoverBridge {
  /**
   * @param {import('./map-controller.js').ConEDMapController} controller
   * @param {HTMLElement} panelEl
   */
  constructor(controller, panelEl) {
    this.controller = controller;
    this.panel = panelEl;
    this._source = null; // 'panel' | 'map' | null
    this._activeSchoolId = null;
    this._activeDistrictId = null;
    this._activeDistrictName = null;
    this._glowSchoolIds = new Set();
  }

  /* ---- Panel → Map ---- */

  onSchoolRowEnter(schoolId) {
    this._source = 'panel';
    this.clearMapHighlights({ keepSource: true });
    this.controller.setSchoolGlow([schoolId], { pulse: true });
    this._activeSchoolId = String(schoolId);
    this._markPanelRow('school', schoolId);
  }

  onSchoolRowLeave() {
    if (this._source !== 'panel') return;
    this.clearAll();
  }

  onDistrictRowEnter(districtName) {
    this._source = 'panel';
    this.clearMapHighlights({ keepSource: true });
    const ids = this.controller.highlightDistrictByName(districtName, { glowSchools: true });
    this._activeDistrictName = districtName;
    this._glowSchoolIds = new Set(ids.schoolIds || []);
    this._activeDistrictId = ids.districtId;
    this._markPanelRow('district', districtName);
  }

  onDistrictRowLeave() {
    if (this._source !== 'panel') return;
    this.clearAll();
  }

  onAreaRowEnter(areaKey) {
    this._source = 'panel';
    this.clearMapHighlights({ keepSource: true });
    const schoolIds = this.controller.highlightAreaSchools(areaKey);
    this._glowSchoolIds = new Set(schoolIds);
    this._markPanelRow('area', areaKey);
  }

  onAreaRowLeave() {
    if (this._source !== 'panel') return;
    this.clearAll();
  }

  /* ---- Map → Panel ---- */

  onMapSchoolEnter(schoolId, props) {
    if (this._source === 'panel') return;
    this._source = 'map';
    this.clearMapHighlights({ keepSource: true });
    this.controller.setSchoolGlow([schoolId], { pulse: true });
    this._activeSchoolId = String(schoolId);
    this._scrollAndMark('school', schoolId);
    this.controller.showSchoolTooltip(props);
  }

  onMapSchoolLeave() {
    if (this._source !== 'map') return;
    this.clearAll();
  }

  onMapDistrictEnter(districtId, districtName, props, lngLat) {
    if (this._source === 'panel') return;
    this._source = 'map';
    this.clearMapHighlights({ keepSource: true });
    this.controller.setDistrictHover(districtId, true);
    const schoolIds = this.controller.glowSchoolsByDistrictName(districtName);
    this._activeDistrictId = districtId;
    this._activeDistrictName = districtName;
    this._glowSchoolIds = new Set(schoolIds);
    this._scrollAndMark('district', districtName);
    this.controller.showDistrictTooltip(props, lngLat);
  }

  onMapDistrictLeave() {
    if (this._source !== 'map') return;
    this.clearAll();
  }

  /* ---- Clear ---- */

  clearAll() {
    this.clearMapHighlights();
    this._clearPanelHot();
    this._source = null;
    this.controller.hideTooltip();
  }

  clearMapHighlights({ keepSource = false } = {}) {
    this.controller.clearSchoolGlow();
    if (this._activeDistrictId != null) {
      this.controller.setDistrictHover(this._activeDistrictId, false);
    }
    this._activeSchoolId = null;
    this._activeDistrictId = null;
    this._activeDistrictName = null;
    this._glowSchoolIds.clear();
    if (!keepSource) this._source = null;
  }

  /* ---- DOM helpers ---- */

  _markPanelRow(kind, key) {
    this._clearPanelHot();
    const sel =
      kind === 'school'
        ? `[data-school-id="${cssEscape(key)}"]`
        : kind === 'district'
          ? `[data-district="${cssEscape(key)}"]`
          : `[data-area="${cssEscape(key)}"]`;
    const el = this.panel.querySelector(sel);
    if (el) el.classList.add('is-hot');
  }

  _scrollAndMark(kind, key) {
    this._clearPanelHot();
    const sel =
      kind === 'school'
        ? `[data-school-id="${cssEscape(key)}"]`
        : `[data-district="${cssEscape(key)}"]`;
    const el = this.panel.querySelector(sel);
    if (!el) return;
    el.classList.add('is-hot');
    // Also highlight parent district/area card
    const card = el.closest('.coned-ml-district-card, .coned-ml-area-card');
    if (card) card.classList.add('is-hot');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  _clearPanelHot() {
    this.panel.querySelectorAll('.is-hot').forEach((el) => el.classList.remove('is-hot'));
  }
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(value));
  return String(value).replace(/"/g, '\\"');
}

/** Wire panel list mouseenter/leave after render */
export function bindPanelHoverListeners(panel, bridge, { viewMode }) {
  if (viewMode === 'district') {
    panel.querySelectorAll('.coned-ml-district-card').forEach((card) => {
      const name = card.getAttribute('data-district');
      card.addEventListener('mouseenter', () => bridge.onDistrictRowEnter(name));
      card.addEventListener('mouseleave', (e) => {
        if (e.relatedTarget && card.contains(/** @type {Node} */ (e.relatedTarget))) return;
        bridge.onDistrictRowLeave();
      });

      card.querySelectorAll('.coned-ml-school-row').forEach((row) => {
        const id = row.getAttribute('data-school-id');
        row.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
          bridge.onSchoolRowEnter(id);
        });
        row.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
          // Moving to another school or back to card chrome — restore district glow
          if (e.relatedTarget && card.contains(/** @type {Node} */ (e.relatedTarget))) {
            if (/** @type {Element} */ (e.relatedTarget).closest?.('.coned-ml-school-row')) {
              return; // next school row will fire enter
            }
            bridge.onDistrictRowEnter(name);
            return;
          }
          bridge.onSchoolRowLeave();
        });
      });
    });
  } else {
    panel.querySelectorAll('.coned-ml-area-card').forEach((card) => {
      const key = card.getAttribute('data-area');
      card.addEventListener('mouseenter', () => bridge.onAreaRowEnter(key));
      card.addEventListener('mouseleave', (e) => {
        if (e.relatedTarget && card.contains(/** @type {Node} */ (e.relatedTarget))) return;
        bridge.onAreaRowLeave();
      });

      card.querySelectorAll('.coned-ml-school-row').forEach((row) => {
        const id = row.getAttribute('data-school-id');
        row.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
          bridge.onSchoolRowEnter(id);
        });
        row.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
          if (e.relatedTarget && card.contains(/** @type {Node} */ (e.relatedTarget))) {
            if (/** @type {Element} */ (e.relatedTarget).closest?.('.coned-ml-school-row')) {
              return;
            }
            bridge.onAreaRowEnter(key);
            return;
          }
          bridge.onSchoolRowLeave();
        });
      });
    });
  }
}
