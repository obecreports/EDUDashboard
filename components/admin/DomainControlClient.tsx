'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignGeoAction } from '@/app/actions/admin';
import {
  ROLE_LABELS,
  formatPersonLabel,
  isOverseerLike,
  isOverseerType1,
  isOverseerType2,
  roleDisplayLabel,
  type OverseerTier,
  type UserRole,
} from '@/lib/types';
import { X } from 'lucide-react';

type Account = {
  id: string;
  email: string;
  full_name: string;
  name_prefix?: string | null;
  role: UserRole;
  overseer_tier?: OverseerTier | null;
  reports_to: string | null;
  assigned_provinces: string[];
  /** Staff: Gov_Domain area_id values (legacy may still be province|district) */
  assigned_districts: string[];
};

type AreaOption = { id: string; name: string; province?: string };

const PAGE_SIZE = 10;

export function DomainControlClient({
  accounts: accountsProp,
  provinces,
  areas,
}: {
  accounts: Account[];
  provinces: string[];
  areas: AreaOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [accounts, setAccounts] = useState(accountsProp);
  const [provinceFilter, setProvinceFilter] = useState('');
  const [pickPage, setPickPage] = useState(1);

  const labelOf = (u: Account) =>
    formatPersonLabel(u.role, u.name_prefix, u.full_name) || u.full_name;

  /** Sort / search by bare name so คำนำหน้า does not hide users */
  const nameKey = (u: Account) => (u.full_name || '').trim();

  const roleBadge = (u: Account) =>
    roleDisplayLabel(u.role, u.overseer_tier);

  const matchesQuery = (u: Account, raw: string) => {
    const q = raw.trim().toLowerCase();
    if (!q) return true;
    const prefix = (u.name_prefix ?? '').trim().toLowerCase();
    const full = (u.full_name ?? '').trim().toLowerCase();
    const labeled = labelOf(u).toLowerCase();
    const email = (u.email ?? '').toLowerCase();
    const badge = roleBadge(u).toLowerCase();
    // Match name without prefix, with prefix, or compact "นางสาวสุนันทา…"
    const compact = `${prefix}${full}`.replace(/\s+/g, '');
    const qCompact = q.replace(/\s+/g, '');
    return (
      labeled.includes(q) ||
      full.includes(q) ||
      prefix.includes(q) ||
      email.includes(q) ||
      u.id.toLowerCase().includes(q) ||
      compact.includes(qCompact) ||
      `${labeled} (${badge})`.includes(q)
    );
  };

  const findUserFromInput = (value: string, pool: Account[]) => {
    const v = value.trim();
    if (!v) return undefined;
    return pool.find(
      (u) =>
        labelOf(u) === v ||
        u.email === v ||
        u.full_name === v ||
        `${labelOf(u)} (${roleBadge(u)})` === v ||
        matchesQuery(u, v)
    );
  };

  const [roleFilter, setRoleFilter] = useState<
    'all' | 'type1' | 'type2' | 'staff'
  >('all');
  const [nameQuery, setNameQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagPick, setTagPick] = useState('');

  useEffect(() => {
    setAccounts(accountsProp);
  }, [accountsProp]);

  const areaById = useMemo(() => {
    const m = new Map<string, string>();
    areas.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [areas]);

  const areaProvinceById = useMemo(() => {
    const m = new Map<string, string>();
    areas.forEach((a) => {
      if (a.province) m.set(a.id, a.province);
    });
    return m;
  }, [areas]);

  const labelForTag = (tag: string, role: UserRole) => {
    if (isOverseerLike(role)) return tag;
    return areaById.get(tag) || tag.replace('|', ' / ');
  };

  const userTouchesProvince = (u: Account, province: string) => {
    if (!province) return true;
    if (isOverseerLike(u.role)) {
      return (u.assigned_provinces ?? []).includes(province);
    }
    if (u.role === 'staff') {
      for (const d of u.assigned_districts ?? []) {
        if (d.includes('|')) {
          const p = d.split('|')[0]?.trim();
          if (p === province) return true;
          continue;
        }
        const mapped = areaProvinceById.get(d);
        if (mapped === province) return true;
      }
      return false;
    }
    return false;
  };

  const assignable = useMemo(
    () => accounts.filter((a) => isOverseerLike(a.role) || a.role === 'staff'),
    [accounts]
  );

  const filteredUsers = useMemo(() => {
    let list = assignable;
    if (roleFilter === 'type1') {
      list = list.filter((a) => isOverseerType1(a.role, a.overseer_tier));
    } else if (roleFilter === 'type2') {
      list = list.filter((a) => isOverseerType2(a.role, a.overseer_tier));
    } else if (roleFilter === 'staff') {
      list = list.filter((a) => a.role === 'staff');
    }
    if (provinceFilter) {
      list = list.filter((a) => userTouchesProvince(a, provinceFilter));
    }
    if (nameQuery.trim()) {
      list = list.filter((a) => matchesQuery(a, nameQuery));
    }
    return list.sort((a, b) => nameKey(a).localeCompare(nameKey(b), 'th'));
  }, [assignable, roleFilter, nameQuery, provinceFilter, areaProvinceById]);

  useEffect(() => {
    setPickPage(1);
  }, [roleFilter, nameQuery, provinceFilter]);

  const pickTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pickSafePage = Math.min(pickPage, pickTotalPages);
  const pagedUsers = useMemo(() => {
    const start = (pickSafePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, pickSafePage]);

  const pickPageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (pickTotalPages <= maxButtons) {
      return Array.from({ length: pickTotalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, pickTotalPages, pickSafePage]);
    for (let d = 1; d <= 2; d++) {
      if (pickSafePage - d > 1) pages.add(pickSafePage - d);
      if (pickSafePage + d < pickTotalPages) pages.add(pickSafePage + d);
    }
    return [...pages].sort((a, b) => a - b);
  }, [pickSafePage, pickTotalPages]);

  const selected = assignable.find((a) => a.id === selectedId) ?? null;

  const pickUser = (id: string) => {
    setSelectedId(id);
    const u = assignable.find((a) => a.id === id);
    if (!u) {
      setTags([]);
      return;
    }
    setNameQuery(labelOf(u));
    setTags(
      isOverseerLike(u.role) ? [...u.assigned_provinces] : [...u.assigned_districts]
    );
    setTagPick('');
    setMsg(null);
  };

  const availableTags = useMemo(() => {
    if (!selected) return [] as string[];
    if (isOverseerLike(selected.role)) {
      // Type 1 and Type 2 both pick freely from all provinces
      return provinces.filter((t) => !tags.includes(t));
    }
    return areas.filter((a) => !tags.includes(a.id)).map((a) => a.id);
  }, [selected, provinces, areas, tags]);

  const addTag = (value: string) => {
    if (!value || tags.includes(value)) return;
    setTags((prev) => [...prev, value]);
    setTagPick('');
  };

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((t) => t !== value));
  };

  const saveDomain = () => {
    if (!selected) {
      setMsg('เลือกผู้ใช้ก่อนบันทึกพื้นที่จัดการ');
      return;
    }
    if (
      !window.confirm(`บันทึกพื้นที่จัดการของ ${labelOf(selected)}?`)
    ) {
      return;
    }
    startTransition(async () => {
      const isOverseerAccount = isOverseerLike(selected.role);

      const fd = new FormData();
      fd.set('userId', selected.id);
      if (isOverseerAccount) {
        fd.set('provinces', JSON.stringify(tags));
        fd.set('districts', '[]');
      } else {
        fd.set('provinces', '[]');
        fd.set('districts', JSON.stringify(tags));
      }
      const res = await assignGeoAction(fd);
      if (!res.ok) {
        setMsg(res.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== selected.id) return a;
          if (isOverseerAccount) {
            return {
              ...a,
              assigned_provinces: [...tags],
            };
          }
          return { ...a, assigned_districts: [...tags] };
        })
      );
      setMsg(`บันทึกพื้นที่จัดการของ ${labelOf(selected)} แล้ว`);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      {msg && <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>}

      <div className="grid gap-4">
        <section className="ed-card p-4 space-y-3">
          <div>
            <h2 className="ed-section-title text-base m-0">1 · ค้นหาและเลือกผู้ใช้</h2>
            <p className="text-sm text-slate-600 m-0 mt-1">
              ค้นด้วยชื่อจริงได้โดยไม่ต้องใส่คำนำหน้า · องคมนตรี / อาสาสมัคร = จังหวัด
              (อาสาสมัครเลือกได้อิสระ) · ศึกษานิเทศก์ = เขตพื้นที่การศึกษา
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">
              บทบาท
              <select
                className="form-input"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(
                    e.target.value as 'all' | 'type1' | 'type2' | 'staff'
                  );
                  setSelectedId('');
                  setTags([]);
                  setNameQuery('');
                }}
              >
                <option value="all">ทั้งหมด</option>
                <option value="type1">{ROLE_LABELS.overseer}</option>
                <option value="type2">{ROLE_LABELS.volunteer}</option>
                <option value="staff">{ROLE_LABELS.staff}</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              จังหวัด
              <select
                className="form-input"
                value={provinceFilter}
                onChange={(e) => {
                  setProvinceFilter(e.target.value);
                  setSelectedId('');
                  setTags([]);
                }}
              >
                <option value="">ทั้งหมด</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              ชื่อผู้ใช้
              <input
                className="form-input"
                list="domain-user-combo"
                value={nameQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setNameQuery(value);
                  const match = findUserFromInput(value, filteredUsers);
                  if (match && (labelOf(match) === value.trim() ||
                    match.email === value.trim() ||
                    match.full_name === value.trim() ||
                    `${labelOf(match)} (${roleBadge(match)})` === value.trim())) {
                    pickUser(match.id);
                  } else {
                    setSelectedId('');
                  }
                }}
                placeholder="พิมพ์ชื่อ (ไม่ต้องใส่คำนำหน้า) หรือเลือกรายการ"
              />
              <datalist id="domain-user-combo">
                {filteredUsers.map((u) => (
                  <option
                    key={u.id}
                    value={`${labelOf(u)} (${roleBadge(u)})`}
                  />
                ))}
              </datalist>
            </label>
          </div>

          {filteredUsers.length > 0 && !selected && (
            <>
              <p className="text-xs text-slate-500 m-0">
                พบ {filteredUsers.length} คน — คลิกเพื่อเลือก
                {filteredUsers.length > PAGE_SIZE
                  ? ` · หน้า ${pickSafePage}/${pickTotalPages}`
                  : ''}
              </p>
              <div className="domain-user-pick">
                {pagedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="domain-user-pick__item"
                    onClick={() => pickUser(u.id)}
                  >
                    <strong>{labelOf(u)}</strong>
                    <span>
                      {roleBadge(u)} · {u.email}
                    </span>
                  </button>
                ))}
              </div>
              {filteredUsers.length > PAGE_SIZE && (
                <div className="pagination-bar">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={pickSafePage <= 1}
                    onClick={() => setPickPage((p) => Math.max(1, p - 1))}
                  >
                    ก่อนหน้า
                  </button>
                  <div className="pagination-pages">
                    {pickPageNumbers.map((n, i) => {
                      const prev = pickPageNumbers[i - 1];
                      const showEllipsis = prev != null && n - prev > 1;
                      return (
                        <span key={n} className="inline-flex items-center gap-1">
                          {showEllipsis && (
                            <span className="text-slate-400 px-1">…</span>
                          )}
                          <button
                            type="button"
                            className={`pagination-num ${
                              pickSafePage === n ? 'pagination-num--active' : ''
                            }`}
                            onClick={() => setPickPage(n)}
                          >
                            {n}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={pickSafePage >= pickTotalPages}
                    onClick={() =>
                      setPickPage((p) => Math.min(pickTotalPages, p + 1))
                    }
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </>
          )}
          {filteredUsers.length === 0 && (
            <p className="text-sm text-slate-500 m-0">ไม่พบผู้ใช้ที่ตรงเงื่อนไข</p>
          )}
        </section>

        {selected && (
          <section className="ed-card p-4 space-y-3">
            <div>
              <h2 className="ed-section-title text-base m-0">2 · มอบหมายพื้นที่จัดการ</h2>
              <p className="text-sm text-slate-600 m-0 mt-1">
                <strong className="text-tm-blue">{labelOf(selected)}</strong>
                {' · '}
                {roleBadge(selected)}
                {' · '}
                {isOverseerLike(selected.role)
                  ? 'เลือกจังหวัด (หลายรายการได้)'
                  : 'เลือกเขตพื้นที่การศึกษา (หลายรายการได้)'}
              </p>
            </div>

            {isOverseerType2(selected.role, selected.overseer_tier) && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 m-0">
                เลือกจังหวัดที่ต้องการ — รายชื่อจะแสดงใน dashboard ขององคมนตรีที่มีจังหวัดทับซ้อน
              </p>
            )}

            <div className="domain-tag-list">
              {tags.length === 0 && (
                <span className="text-sm text-slate-500">ยังไม่ได้เลือกพื้นที่</span>
              )}
              {tags.map((t) => (
                <span key={t} className="domain-tag">
                  {labelForTag(t, selected.role)}
                  <button type="button" aria-label="ลบ" onClick={() => removeTag(t)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            <label className="grid gap-1 text-sm font-semibold">
              เพิ่ม{isOverseerLike(selected.role) ? 'จังหวัด' : 'เขตพื้นที่การศึกษา'}
              <select
                className="form-input"
                value={tagPick}
                onChange={(e) => {
                  const v = e.target.value;
                  setTagPick(v);
                  if (v) addTag(v);
                }}
              >
                <option value="">— เลือกเพื่อเพิ่ม —</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {selected.role === 'staff' ? labelForTag(t, 'staff') : t}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ed-btn ed-btn--primary"
                disabled={pending}
                onClick={saveDomain}
              >
                {pending ? 'กำลังบันทึก…' : 'บันทึกพื้นที่จัดการ'}
              </button>
              <button
                type="button"
                className="ed-btn ed-btn--outline"
                onClick={() => {
                  setSelectedId('');
                  setTags([]);
                  setNameQuery('');
                }}
              >
                เลือกผู้ใช้อื่น
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
