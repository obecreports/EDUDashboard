/**
 * ConED MapLibre app — detail panel with district/area switcher + hover sync
 */
import { ConEDMapController } from './map-controller.js';
import { HoverBridge, bindPanelHoverListeners } from './hover-bridge.js';

const els = {
  map: document.getElementById('coned-maplibre-map'),
  panel: document.getElementById('coned-ml-detail-panel'),
  loading: document.getElementById('coned-ml-loading'),
  btnReset: document.getElementById('coned-ml-btn-reset'),
  modal: document.getElementById('coned-ml-modal'),
  modalName: document.getElementById('coned-ml-modal-name'),
  modalConfirm: document.getElementById('coned-ml-modal-confirm'),
};

let provinceStats = new Map();
let provinceSearch = '';
let pendingSchool = null;
/** @type {'district' | 'area'} */
let viewMode = 'district';
let currentProvincePayload = null;

const controller = new ConEDMapController(els.map, {
  onReady: ({ provinceStats: stats, schoolCount, schoolsSource }) => {
    provinceStats = stats;
    els.loading.hidden = true;
    renderNationalPanel();
    console.info(
      `[ConED MapLibre] Ready — ${schoolCount} schools (${schoolsSource}), ${stats.size} active provinces`
    );
  },
  onSelectionChange: handleSelection,
});

const hoverBridge = new HoverBridge(controller, els.panel);
controller.attachHoverBridge(hoverBridge);

els.btnReset.addEventListener('click', () => {
  hoverBridge.clearAll();
  viewMode = 'district';
  currentProvincePayload = null;
  controller.resetView();
});

els.modal.querySelectorAll('[data-close-modal]').forEach((el) => {
  el.addEventListener('click', () => closeModal());
});

els.modalConfirm.addEventListener('click', () => {
  if (pendingSchool?.school_id) {
    window.dispatchEvent(
      new CustomEvent('coned-ml:open-school', { detail: pendingSchool })
    );
    // When embedded in the Vite dashboard, navigate via parent React router
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: 'coned-ml:open-school', detail: pendingSchool },
        '*'
      );
    }
    const base =
      (typeof window.CONED_SCHOOL_DETAIL_BASE === 'string' && window.CONED_SCHOOL_DETAIL_BASE) ||
      '';
    if (base) window.location.href = `${base}${pendingSchool.school_id}`;
  }
  closeModal();
});

function handleSelection(payload) {
  if (payload.type === 'ready' || payload.type === 'reset') {
    provinceStats = payload.provinceStats || provinceStats;
    els.btnReset.hidden = true;
    currentProvincePayload = null;
    renderNationalPanel();
    return;
  }

  if (payload.type === 'province') {
    els.btnReset.hidden = false;
    currentProvincePayload = payload;
    renderProvincePanel(payload);
    return;
  }

  if (payload.type === 'district') {
    // Panel already rendered; map click zooms — soft-highlight matching card
    const name = payload.properties.district_name_th;
    els.panel.querySelectorAll('.coned-ml-district-card').forEach((card) => {
      const match = namesMatch(card.getAttribute('data-district'), name);
      card.classList.toggle('is-hot', match);
      if (match) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return;
  }

  if (payload.type === 'school') {
    openSchoolModal(payload.properties);
  }
}

/* ---- National list ---- */

function renderNationalPanel() {
  hoverBridge.clearAll();
  els.panel.classList.add('is-national');

  const list = Array.from(provinceStats.values()).sort((a, b) => b.schools - a.schools);
  const filtered = provinceSearch.trim()
    ? list.filter((p) =>
        p.provinceName.toLowerCase().includes(provinceSearch.trim().toLowerCase())
      )
    : list;

  els.panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:0.75rem;">
      <div>
        <h2 class="coned-ml-panel-heading" style="font-size:1.125rem;">รายชื่อจังหวัดทั้งหมด</h2>
        <p style="margin:0.15rem 0 0;font-size:0.7rem;color:#64748b;">
          คลิกเลือกจังหวัดจากรายการ หรือคลิกบนแผนที่
        </p>
      </div>
      <span class="coned-ml-chip">${list.length} จังหวัด</span>
    </div>

    <div class="coned-ml-search">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="search" id="coned-ml-province-search" placeholder="ค้นหาชื่อจังหวัด…" value="${escapeAttr(provinceSearch)}" />
    </div>

    <div class="coned-ml-scroll coned-ml-scroll-tall" id="coned-ml-prov-list">
      ${
        filtered.length
          ? filtered
              .map(
                (p) => `
        <div class="coned-ml-prov-row" data-province="${escapeAttr(p.provinceName)}">
          <div>
            <div>
              <strong>${escapeHtml(p.provinceName)}</strong>
              <span class="coned-ml-badge">${p.areasCount} เขต</span>
            </div>
            <div style="font-size:0.65rem;color:#64748b;margin-top:0.15rem;">
              ${p.students.toLocaleString()} นักเรียน • ${p.personnel.toLocaleString()} บุคลากร
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <div class="coned-ml-count-box">
              <strong>${p.schools}</strong>
              <span>โรงเรียน</span>
            </div>
            <span style="color:#38bdf8;">›</span>
          </div>
        </div>`
              )
              .join('')
          : `<p class="coned-ml-empty">ไม่พบจังหวัดที่ตรงกับ “${escapeHtml(provinceSearch)}”</p>`
      }
    </div>
  `;

  const search = document.getElementById('coned-ml-province-search');
  search?.addEventListener('input', (e) => {
    provinceSearch = e.target.value;
    renderNationalPanel();
    const again = document.getElementById('coned-ml-province-search');
    if (again) {
      again.focus();
      again.setSelectionRange(provinceSearch.length, provinceSearch.length);
    }
  });

  els.panel.querySelectorAll('[data-province]').forEach((row) => {
    row.addEventListener('click', () => {
      controller.selectProvinceByName(row.getAttribute('data-province'));
    });
  });
}

/* ---- Province detail with view switcher ---- */

function renderProvincePanel(payload) {
  hoverBridge.clearAll();
  els.panel.classList.remove('is-national');
  const stats = payload.stats;
  const name = payload.properties.zone_name_th;

  if (!stats) {
    els.panel.innerHTML = `<p class="coned-ml-empty">ไม่มีข้อมูลโรงเรียนในจังหวัดนี้</p>`;
    return;
  }

  const districtList = Array.from(stats.districts.values()).sort(
    (a, b) => b.schools.length - a.schools.length
  );
  const areaList = Array.from(stats.areas.values()).sort(
    (a, b) => b.schools.length - a.schools.length
  );

  const groupsHtml =
    viewMode === 'district'
      ? renderDistrictGroups(districtList)
      : renderAreaGroups(areaList);

  els.panel.innerHTML = `
    <div style="border-bottom:1px solid #bae6fd;padding-bottom:0.75rem;">
      <div class="coned-ml-panel-label">จังหวัดที่เลือก (คลิกซูมขยายแล้ว)</div>
      <h2 class="coned-ml-panel-heading">${escapeHtml(name)}</h2>
    </div>

    <div class="coned-ml-stats">
      <div class="coned-ml-stat"><span>โรงเรียน</span><strong>${stats.schools} แห่ง</strong></div>
      <div class="coned-ml-stat"><span>เขตพื้นที่</span><strong>${stats.areasCount} เขต</strong></div>
      <div class="coned-ml-stat"><span>นักเรียน</span><strong>${stats.students.toLocaleString()}</strong></div>
      <div class="coned-ml-stat"><span>บุคลากร</span><strong>${stats.personnel.toLocaleString()}</strong></div>
    </div>

    <div style="border-top:1px solid #bae6fd;padding-top:0.75rem;">
      <div class="coned-ml-switcher" role="tablist">
        <button type="button" class="coned-ml-switch-btn ${viewMode === 'district' ? 'is-active' : ''}" data-view="district" role="tab" aria-selected="${viewMode === 'district'}">
          แบ่งตามอำเภอ (${districtList.length})
        </button>
        <button type="button" class="coned-ml-switch-btn ${viewMode === 'area' ? 'is-active' : ''}" data-view="area" role="tab" aria-selected="${viewMode === 'area'}">
          แบ่งตามเขตพื้นที่ (${areaList.length})
        </button>
      </div>

      <div class="coned-ml-section-title">
        <span>${viewMode === 'district' ? 'แบ่งตามอำเภอ' : 'แบ่งตามเขตพื้นที่การศึกษา'}</span>
        <span style="font-weight:400;font-size:0.75rem;color:#0369a1;">
          (${viewMode === 'district' ? districtList.length + ' อำเภอ' : areaList.length + ' เขตพื้นที่'})
        </span>
      </div>

      <div class="coned-ml-scroll" id="coned-ml-group-list">
        ${groupsHtml}
      </div>
    </div>
  `;

  els.panel.querySelectorAll('.coned-ml-switch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-view');
      if (next === viewMode) return;
      viewMode = /** @type {'district'|'area'} */ (next);
      hoverBridge.clearAll();
      if (currentProvincePayload) renderProvincePanel(currentProvincePayload);
    });
  });

  const groups = viewMode === 'district' ? districtList : areaList;

  els.panel.querySelectorAll('.coned-ml-school-row').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-school-id');
      for (const g of groups) {
        const school = g.schools.find((s) => String(s.school_id) === id);
        if (school) {
          openSchoolModal(school);
          break;
        }
      }
    });
  });

  bindPanelHoverListeners(els.panel, hoverBridge, { viewMode });
}

function renderDistrictGroups(districtList) {
  if (!districtList.length) {
    return `<p class="coned-ml-empty">ไม่มีข้อมูลแบ่งตามอำเภอสำหรับจังหวัดนี้</p>`;
  }
  return districtList
    .map(
      (d) => `
    <div class="coned-ml-district-card" data-district="${escapeAttr(d.name)}">
      <div class="coned-ml-district-head">
        <div>
          <strong>${escapeHtml(d.name)}</strong>
          <div class="meta">${d.schools.length} โรงเรียน</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.7rem;font-weight:600;color:#075985;">${d.students.toLocaleString()} นักเรียน</div>
          <div class="meta">${d.personnel.toLocaleString()} บุคลากร</div>
        </div>
      </div>
      <div class="coned-ml-school-list coned-ml-school-list--amber">
        ${schoolRowsHtml(d.schools)}
      </div>
    </div>`
    )
    .join('');
}

function renderAreaGroups(areaList) {
  if (!areaList.length) {
    return `<p class="coned-ml-empty">ไม่มีข้อมูลเขตพื้นที่การศึกษาสำหรับจังหวัดนี้</p>`;
  }
  return areaList
    .map(
      (a) => `
    <div class="coned-ml-area-card coned-ml-district-card" data-area="${escapeAttr(a.areaKey)}">
      <div class="coned-ml-district-head">
        <div>
          <strong>${escapeHtml(a.areaName)}</strong>
          <div class="meta">${a.schools.length} โรงเรียน${a.areaId ? ` · รหัส ${escapeHtml(a.areaId)}` : ''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.7rem;font-weight:600;color:#075985;">${a.students.toLocaleString()} นักเรียน</div>
          <div class="meta">${a.personnel.toLocaleString()} บุคลากร</div>
        </div>
      </div>
      <div class="coned-ml-school-list coned-ml-school-list--sky">
        ${schoolRowsHtml(a.schools)}
      </div>
    </div>`
    )
    .join('');
}

function schoolRowsHtml(schools) {
  return schools
    .map(
      (s) => `
    <div class="coned-ml-school-row" data-school-id="${escapeAttr(s.school_id)}">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px;" title="${escapeAttr(s.school_name_th)}">
        • ${escapeHtml(s.school_name_th || 'ไม่ระบุ')}
      </span>
      <span style="flex-shrink:0;color:#64748b;font-size:0.65rem;">
        <span style="color:#0369a1;font-weight:600;">${Number(s.students || 0).toLocaleString()}</span> นร. /
        <span style="color:#0369a1;font-weight:600;">${Number(s.personnel || 0).toLocaleString()}</span> บค.
      </span>
    </div>`
    )
    .join('');
}

function openSchoolModal(props) {
  pendingSchool = {
    school_id: props.school_id || props.id,
    school_name_th: props.school_name_th || props.school_name,
  };
  els.modalName.textContent = pendingSchool.school_name_th || '';
  els.modal.hidden = false;
}

function closeModal() {
  els.modal.hidden = true;
  pendingSchool = null;
}

function namesMatch(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
