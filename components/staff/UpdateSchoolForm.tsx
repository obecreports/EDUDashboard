'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { SchoolSwot } from '@/lib/auth/user-store';
import { saveSchoolUpdateBundleAction } from '@/app/actions/school-extras';
import {
  SWOT_EXTERNAL_FIELDS,
  SWOT_INTERNAL_FIELDS,
  emptySchoolSwot,
  normalizeSchoolSwot,
} from '@/lib/swot/schema';

type SchoolOption = {
  id: number;
  name: string;
  area_id: string;
  area_name: string;
  province: string;
  editable: boolean;
};

type ExtrasPayload = {
  swot: SchoolSwot;
  comments: { id: string; staff_name: string; text: string; created_at: string }[];
};

function SwotCategoryBlock({
  title,
  strengths,
  weaknesses,
  onStrengths,
  onWeaknesses,
}: {
  title: string;
  strengths: string;
  weaknesses: string;
  onStrengths: (v: string) => void;
  onWeaknesses: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50/60">
      <h4 className="m-0 text-sm font-bold text-tm-blue">{title}</h4>
      <label className="block text-sm">
        จุดแข็ง (Strengths)
        <textarea
          className="form-input"
          rows={3}
          value={strengths}
          onChange={(e) => onStrengths(e.target.value)}
          placeholder={`จุดแข็งด้าน${title}…`}
        />
      </label>
      <label className="block text-sm">
        จุดอ่อน (Weaknesses)
        <textarea
          className="form-input"
          rows={3}
          value={weaknesses}
          onChange={(e) => onWeaknesses(e.target.value)}
          placeholder={`จุดอ่อนด้าน${title}…`}
        />
      </label>
    </div>
  );
}

export function UpdateSchoolForm({
  schools,
  initialSchoolId,
  extrasBySchool,
}: {
  schools: SchoolOption[];
  initialSchoolId?: string | null;
  extrasBySchool: Record<string, ExtrasPayload>;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    if (!initialSchoolId) return '';
    const match = schools.find((s) => String(s.id) === String(initialSchoolId) && s.editable);
    return match ? String(match.id) : '';
  });
  const [swot, setSwot] = useState<SchoolSwot>(emptySchoolSwot());
  const [comment, setComment] = useState('');
  const [recentComments, setRecentComments] = useState<ExtrasPayload['comments']>([]);
  const [pending, start] = useTransition();

  const editableSchools = useMemo(() => schools.filter((s) => s.editable), [schools]);

  const selected = useMemo(
    () => editableSchools.find((s) => String(s.id) === selectedId) ?? null,
    [editableSchools, selectedId]
  );

  useEffect(() => {
    if (!selectedId) {
      setSwot(emptySchoolSwot());
      setRecentComments([]);
      return;
    }
    const extras = extrasBySchool[selectedId];
    setSwot(extras?.swot ? normalizeSchoolSwot(extras.swot) : emptySchoolSwot());
    setRecentComments(extras?.comments ?? []);
    setComment('');
  }, [selectedId, extrasBySchool]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <>
      {toast && (
        <div className="save-toast" role="status">
          {toast}
        </div>
      )}

      <form
        className="panel-card space-y-5"
        action={(fd) => {
          if (!selected) {
            setToast('กรุณาเลือกโรงเรียนในเขตที่รับผิดชอบ');
            return;
          }
          start(async () => {
            fd.set('school_id', String(selected.id));
            fd.set('swot_json', JSON.stringify(swot));
            fd.set('text', comment);
            const res = await saveSchoolUpdateBundleAction(fd);
            if (!res.ok) {
              setToast(('error' in res && res.error) || 'บันทึกไม่สำเร็จ');
              return;
            }
            if (res.comment) {
              setRecentComments((prev) => [
                {
                  id: res.comment!.id,
                  staff_name: res.comment!.staff_name,
                  text: res.comment!.text,
                  created_at: res.comment!.created_at,
                },
                ...prev,
              ]);
              setComment('');
            } else if (comment.trim()) {
              setComment('');
            }
            setToast(
              res.warning
                ? `บันทึกในเครื่องแล้ว (ฐานข้อมูล: ${res.warning})`
                : 'บันทึก SWOT และความคิดเห็นเรียบร้อยแล้ว'
            );
          });
        }}
      >
        {editableSchools.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3 m-0">
            ไม่มีโรงเรียนภายใต้ความรับผิดชอบ — มอบหมายเขตพื้นที่ในโปรไฟล์ก่อน
          </p>
        ) : (
          <label className="block text-sm font-semibold">
            เลือกโรงเรียนในเขตที่รับผิดชอบ
            <select
              className="form-input"
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="" disabled>
                — เลือกโรงเรียน —
              </option>
              {editableSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.area_name ? ` · ${s.area_name}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {selected && (
          <>
            <section className="space-y-3">
              <h2 className="section-heading text-base">ความคิดเห็นและบันทึกติดตาม</h2>
              <label className="block text-sm">
                บันทึกใหม่
                <textarea
                  className="form-input"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="ความคืบหน้า / หมายเหตุการเยี่ยม / ข้อติดตาม…"
                />
              </label>
              {recentComments.length > 0 && (
                <ul className="m-0 p-0 list-none space-y-2">
                  {recentComments.slice(0, 5).map((c) => (
                    <li key={c.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                      <div className="text-xs text-slate-500 mb-1">
                        <strong className="text-tm-blue">{c.staff_name}</strong> ·{' '}
                        {new Date(c.created_at).toLocaleString('th-TH')}
                      </div>
                      <div>{c.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="section-heading text-base">การวิเคราะห์ SWOT</h2>
              <h3 className="font-bold text-tm-blue text-sm m-0">สภาพแวดล้อมภายใน</h3>
              <div className="space-y-3">
                {SWOT_INTERNAL_FIELDS.map((f) => (
                  <SwotCategoryBlock
                    key={f.key}
                    title={f.label}
                    strengths={swot.internal[f.key].strengths}
                    weaknesses={swot.internal[f.key].weaknesses}
                    onStrengths={(v) =>
                      setSwot((prev) => ({
                        ...prev,
                        internal: {
                          ...prev.internal,
                          [f.key]: { ...prev.internal[f.key], strengths: v },
                        },
                      }))
                    }
                    onWeaknesses={(v) =>
                      setSwot((prev) => ({
                        ...prev,
                        internal: {
                          ...prev.internal,
                          [f.key]: { ...prev.internal[f.key], weaknesses: v },
                        },
                      }))
                    }
                  />
                ))}
              </div>
              <h3 className="font-bold text-tm-blue text-sm m-0 pt-2">สภาพแวดล้อมภายนอก</h3>
              <div className="space-y-3">
                {SWOT_EXTERNAL_FIELDS.map((f) => (
                  <SwotCategoryBlock
                    key={f.key}
                    title={f.label}
                    strengths={swot.external[f.key].strengths}
                    weaknesses={swot.external[f.key].weaknesses}
                    onStrengths={(v) =>
                      setSwot((prev) => ({
                        ...prev,
                        external: {
                          ...prev.external,
                          [f.key]: { ...prev.external[f.key], strengths: v },
                        },
                      }))
                    }
                    onWeaknesses={(v) =>
                      setSwot((prev) => ({
                        ...prev,
                        external: {
                          ...prev.external,
                          [f.key]: { ...prev.external[f.key], weaknesses: v },
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </section>

            <button type="submit" className="navbar__login" disabled={pending}>
              {pending ? 'กำลังบันทึก…' : 'บันทึกการอัปเดต'}
            </button>
          </>
        )}
      </form>
    </>
  );
}
