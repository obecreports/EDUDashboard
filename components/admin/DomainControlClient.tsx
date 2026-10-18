'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignGeoAction, setReportsToAction } from '@/app/actions/admin';
import {
  ROLE_LABELS,
  effectiveOverseerTier,
  formatPersonLabel,
  isOverseerLike,
  isOverseerType1,
  isOverseerType2,
  overseerTierLabel,
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

type AreaOption = { id: string; name: string };

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

  const labelOf = (u: Account) =>
    formatPersonLabel(u.role, u.name_prefix, u.full_name) || u.full_name;

  const [roleFilter, setRoleFilter] = useState<
    'all' | 'overseer' | 'volunteer' | 'staff'
  >('all');
  const [nameQuery, setNameQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagPick, setTagPick] = useState('');
  const [tierDraft, setTierDraft] = useState<OverseerTier>('type1');
  const [parentDraft, setParentDraft] = useState('');

  useEffect(() => {
    setAccounts(accountsProp);
  }, [accountsProp]);

  const areaById = useMemo(() => {
    const m = new Map<string, string>();
    areas.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [areas]);

  const labelForTag = (tag: string, role: UserRole) => {
    if (isOverseerLike(role)) return tag;
    return areaById.get(tag) || tag.replace('|', ' / ');
  };

  const assignable = useMemo(
    () => accounts.filter((a) => isOverseerLike(a.role) || a.role === 'staff'),
    [accounts]
  );

  const type1Overseers = useMemo(
    () =>
      accounts.filter(
        (a) => a.role === 'overseer' && isOverseerType1(a.role, a.overseer_tier)
      ),
    [accounts]
  );

  const filteredUsers = useMemo(() => {
    let list = assignable;
    if (roleFilter !== 'all') list = list.filter((a) => a.role === roleFilter);
    if (nameQuery.trim()) {
      const q = nameQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          labelOf(a).toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'th'));
  }, [assignable, roleFilter, nameQuery]);

  const selected = assignable.find((a) => a.id === selectedId) ?? null;

  const parentProvinces = useMemo(() => {
    if (!selected || tierDraft !== 'type2') return provinces;
    const parentId = parentDraft || selected.reports_to;
    const parent = accounts.find((a) => a.id === parentId);
    if (!parent) return [] as string[];
    return parent.assigned_provinces ?? [];
  }, [selected, tierDraft, parentDraft, accounts, provinces]);

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
    if (u.role === 'overseer') {
      setTierDraft(effectiveOverseerTier(u.role, u.overseer_tier) ?? 'type1');
      setParentDraft(u.reports_to ?? '');
    } else {
      setTierDraft('type1');
      setParentDraft('');
    }
  };

  const availableTags = useMemo(() => {
    if (!selected) return [] as string[];
    if (isOverseerLike(selected.role)) {
      const pool =
        selected.role === 'overseer' && tierDraft === 'type2'
          ? parentProvinces
          : provinces;
      return pool.filter((t) => !tags.includes(t));
    }
    return areas.filter((a) => !tags.includes(a.id)).map((a) => a.id);
  }, [selected, provinces, areas, tags, tierDraft, parentProvinces]);

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
    startTransition(async () => {
      // Type 2 must link parent Type 1 first
      if (selected.role === 'overseer' && tierDraft === 'type2') {
        if (!parentDraft) {
          setMsg('เลือกองคมนตรีระดับ 1 ที่เป็นหัวหน้าก่อน');
          return;
        }
        const link = await setReportsToAction(
          (() => {
            const fd = new FormData();
            fd.set('userId', selected.id);
            fd.set('reportsTo', parentDraft);
            return fd;
          })()
        );
        if (!link.ok) {
          setMsg(link.error || 'ตั้งหัวหน้าไม่สำเร็จ');
          return;
        }
      }
      if (
        selected.role === 'overseer' &&
        tierDraft === 'type1' &&
        selected.reports_to &&
        isOverseerType2(selected.role, selected.overseer_tier)
      ) {
        // Promoting back to Type 1: clear overseer parent via SO if already set, or leave reports_to
        // Tier is set on geo save
      }

      const fd = new FormData();
      fd.set('userId', selected.id);
      if (selected.role === 'overseer') {
        fd.set('overseerTier', tierDraft);
      }
      if (isOverseerLike(selected.role)) {
        const allowed =
          selected.role === 'overseer' && tierDraft === 'type2'
            ? new Set(parentProvinces)
            : null;
        const nextTags = allowed
          ? tags.filter((t) => allowed.has(t))
          : tags;
        fd.set('provinces', JSON.stringify(nextTags));
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
          if (isOverseerLike(selected.role)) {
            return {
              ...a,
              assigned_provinces: [...tags].filter((t) =>
                selected.role === 'overseer' && tierDraft === 'type2'
                  ? parentProvinces.includes(t)
                  : true
              ),
              overseer_tier:
                selected.role === 'overseer' ? tierDraft : a.overseer_tier,
              reports_to:
                selected.role === 'overseer' && tierDraft === 'type2'
                  ? parentDraft || a.reports_to
                  : a.reports_to,
            };
          }
          return { ...a, assigned_districts: [...tags] };
        })
      );
      setMsg(`บันทึกพื้นที่จัดการของ ${labelOf(selected)} แล้ว`);
      router.refresh();
    });
  };

  const roleBadge = (u: Account) => {
    if (u.role === 'overseer') {
      return overseerTierLabel(effectiveOverseerTier(u.role, u.overseer_tier));
    }
    return ROLE_LABELS[u.role];
  };

  return (
    <div className="grid gap-4">
      {msg && <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>}

      <div className="grid gap-4">
        <section className="ed-card p-4 space-y-3">
          <div>
            <h2 className="ed-section-title text-base m-0">1 · ค้นหาและเลือกผู้ใช้</h2>
            <p className="text-sm text-slate-600 m-0 mt-1">
              องคมนตรี Type 1 / Type 2 = มอบหมายจังหวัด · Staff = เขตพื้นที่การศึกษา
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              บทบาท
              <select
                className="form-input"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(
                    e.target.value as 'all' | 'overseer' | 'volunteer' | 'staff'
                  );
                  setSelectedId('');
                  setTags([]);
                  setNameQuery('');
                }}
              >
                <option value="all">ทั้งหมด</option>
                <option value="overseer">{ROLE_LABELS.overseer}</option>
                <option value="volunteer">{ROLE_LABELS.volunteer}</option>
                <option value="staff">{ROLE_LABELS.staff}</option>
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
                  const match = filteredUsers.find(
                    (u) =>
                      labelOf(u) === value ||
                      u.email === value ||
                      `${labelOf(u)} (${roleBadge(u)})` === value
                  );
                  if (match) pickUser(match.id);
                  else setSelectedId('');
                }}
                placeholder="พิมพ์ชื่อหรือเลือกจากรายการ"
              />
              <datalist id="domain-user-combo">
                {filteredUsers.slice(0, 80).map((u) => (
                  <option
                    key={u.id}
                    value={`${labelOf(u)} (${roleBadge(u)})`}
                  />
                ))}
              </datalist>
            </label>
          </div>

          {filteredUsers.length > 0 && !selected && (
            <div className="domain-user-pick">
              {filteredUsers.slice(0, 12).map((u) => (
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

            {selected.role === 'overseer' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">
                  ระดับองคมนตรี
                  <select
                    className="form-input"
                    value={tierDraft}
                    onChange={(e) => {
                      const next = e.target.value as OverseerTier;
                      setTierDraft(next);
                      setTags((prev) => {
                        if (next !== 'type2') return prev;
                        const parent = accounts.find(
                          (a) => a.id === (parentDraft || selected.reports_to)
                        );
                        const allowed = new Set(parent?.assigned_provinces ?? []);
                        return prev.filter((t) => allowed.has(t));
                      });
                    }}
                  >
                    <option value="type1">ระดับ 1 (Type 1)</option>
                    <option value="type2">ระดับ 2 (Type 2)</option>
                  </select>
                </label>
                {tierDraft === 'type2' && (
                  <label className="grid gap-1 text-sm font-semibold">
                    หัวหน้า Type 1
                    <select
                      className="form-input"
                      value={parentDraft}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setParentDraft(pid);
                        const parent = accounts.find((a) => a.id === pid);
                        const allowed = new Set(parent?.assigned_provinces ?? []);
                        setTags((prev) => prev.filter((t) => allowed.has(t)));
                      }}
                    >
                      <option value="">— เลือกองคมนตรีระดับ 1 —</option>
                      {type1Overseers
                        .filter((o) => o.id !== selected.id)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {labelOf(o)}
                            {o.assigned_provinces.length
                              ? ` (${o.assigned_provinces.join(', ')})`
                              : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {selected.role === 'overseer' &&
              tierDraft === 'type2' &&
              parentProvinces.length === 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 m-0">
                  หัวหน้า Type 1 ยังไม่มีจังหวัด — มอบหมายจังหวัดให้ Type 1 ก่อน
                  หรือเลือกหัวหน้าอื่น
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
