'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { SchoolSwot } from '@/lib/auth/user-store';
import { saveSchoolUpdateBundleAction } from '@/app/actions/school-extras';
import { emptySchoolSwot, normalizeSchoolSwot } from '@/lib/swot/schema';

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

function SwotLongField({
  code,
  title,
  value,
  onChange,
  placeholder,
}: {
  code: string;
  title: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-semibold space-y-1">
      <span>
        {code} {title}
      </span>
      <textarea
        className="form-input"
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
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
              <h3 className="font-bold text-tm-blue text-sm m-0">1 สภาพแวดล้อมภายใน</h3>
              <div className="space-y-3">
                <SwotLongField
                  code="1.1"
                  title="จุดแข็ง (Strengths)"
                  value={swot.internal.strengths}
                  onChange={(v) =>
                    setSwot((prev) => ({
                      ...prev,
                      internal: { ...prev.internal, strengths: v },
                    }))
                  }
                  placeholder="อธิบายจุดแข็งภายในเป็นข้อความยาว…"
                />
                <SwotLongField
                  code="1.2"
                  title="จุดอ่อน (Weaknesses)"
                  value={swot.internal.weaknesses}
                  onChange={(v) =>
                    setSwot((prev) => ({
                      ...prev,
                      internal: { ...prev.internal, weaknesses: v },
                    }))
                  }
                  placeholder="อธิบายจุดอ่อนภายในเป็นข้อความยาว…"
                />
              </div>
              <h3 className="font-bold text-tm-blue text-sm m-0 pt-2">2 สภาพแวดล้อมภายนอก</h3>
              <div className="space-y-3">
                <SwotLongField
                  code="2.1"
                  title="จุดแข็ง (Strengths)"
                  value={swot.external.strengths}
                  onChange={(v) =>
                    setSwot((prev) => ({
                      ...prev,
                      external: { ...prev.external, strengths: v },
                    }))
                  }
                  placeholder="อธิบายจุดแข็งภายนอกเป็นข้อความยาว…"
                />
                <SwotLongField
                  code="2.2"
                  title="อุปสรรค (Threats)"
                  value={swot.external.threats}
                  onChange={(v) =>
                    setSwot((prev) => ({
                      ...prev,
                      external: { ...prev.external, threats: v },
                    }))
                  }
                  placeholder="อธิบายอุปสรรคภายนอกเป็นข้อความยาว…"
                />
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
