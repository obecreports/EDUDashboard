'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  assignSchoolDirectorAction,
  clearSchoolDirectorAction,
  previewDirectorActiveSchoolsAction,
} from '@/app/actions/admin-directors';
import {
  AdminSchoolScopePicker,
  type ScopeSchoolOption,
} from '@/components/admin/AdminSchoolScopePicker';
import {
  DIRECTOR_TBA_LABEL,
  formatDisplayName,
  type SchoolDirector,
} from '@/lib/types';
import { AlertTriangle, X } from 'lucide-react';

export type AssignSchoolRow = ScopeSchoolOption & {
  director_id: string | null;
  director_label: string;
};

type Props = {
  schools: AssignSchoolRow[];
  directors: SchoolDirector[];
  initialSchoolId?: string;
  initialDirectorId?: string;
};

export function AdminDirectorAssignClient({
  schools,
  directors,
  initialSchoolId = '',
  initialDirectorId = '',
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [directorId, setDirectorId] = useState(initialDirectorId);
  const [mode, setMode] = useState<'assign' | 'remove'>('assign');
  const [directorQ, setDirectorQ] = useState('');
  const [warnSchools, setWarnSchools] = useState<
    { school_id: number; school_name: string }[]
  >([]);

  const selectedSchool = schools.find((s) => s.id === schoolId) ?? null;
  const selectedDirector =
    directors.find((d) => d.director_id === directorId) ?? null;

  useEffect(() => {
    if (initialSchoolId) setSchoolId(initialSchoolId);
  }, [initialSchoolId]);

  useEffect(() => {
    if (initialDirectorId) {
      setDirectorId(initialDirectorId);
      setMode('assign');
    }
  }, [initialDirectorId]);

  useEffect(() => {
    if (mode !== 'assign' || !directorId) {
      setWarnSchools([]);
      return;
    }
    start(async () => {
      const res = await previewDirectorActiveSchoolsAction(directorId);
      if (!res.ok) {
        setWarnSchools([]);
        return;
      }
      setWarnSchools(
        res.schools.filter((s) => String(s.school_id) !== String(schoolId))
      );
    });
  }, [directorId, mode, schoolId]);

  const filteredDirectors = useMemo(() => {
    const q = directorQ.trim().toLowerCase();
    if (!q) return directors;
    return directors.filter((d) => {
      const label = formatDisplayName(d.name_prefix, d.full_name).toLowerCase();
      return label.includes(q) || d.full_name.toLowerCase().includes(q);
    });
  }, [directors, directorQ]);

  const confirm = () => {
    if (!schoolId) {
      setErr('เลือกโรงเรียนก่อน');
      return;
    }
    setMsg(null);
    setErr(null);
    start(async () => {
      if (mode === 'remove') {
        const fd = new FormData();
        fd.set('school_id', schoolId);
        const res = await clearSchoolDirectorAction(fd);
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setMsg(`ลบผู้อำนวยการแล้ว · เป็น ${DIRECTOR_TBA_LABEL}`);
        router.push('/admin/directors');
        router.refresh();
        return;
      }
      if (!directorId) {
        setErr('เลือกผู้อำนวยการก่อนยืนยัน');
        return;
      }
      const fd = new FormData();
      fd.set('school_id', schoolId);
      fd.set('director_id', directorId);
      const res = await assignSchoolDirectorAction(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg('มอบหมายผู้อำนวยการแล้ว');
      router.push('/admin/directors');
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="ed-card p-3 text-sm text-tm-blue bg-tm-blue-50">{msg}</div>
      )}
      {err && (
        <div className="ed-card p-3 text-sm text-red-700 bg-red-50">{err}</div>
      )}

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0">1 · เลือกโรงเรียน</h2>
        <AdminSchoolScopePicker
          schools={schools}
          value={schoolId}
          onChange={(id) => {
            setSchoolId(id);
            setMsg(null);
            setErr(null);
          }}
        />
        {selectedSchool && (
          <p className="text-sm m-0 text-slate-600">
            ผู้อำนวยการปัจจุบัน:{' '}
            <strong>
              {selectedSchool.director_id
                ? selectedSchool.director_label
                : DIRECTOR_TBA_LABEL}
            </strong>
          </p>
        )}
      </section>

      <section className="ed-card p-4 space-y-3">
        <h2 className="ed-section-title text-base m-0">2 · เลือกการดำเนินการ</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`ed-btn ${mode === 'assign' ? 'ed-btn--primary' : 'ed-btn--outline'}`}
            onClick={() => setMode('assign')}
          >
            มอบหมายผู้อำนวยการ
          </button>
          <button
            type="button"
            className={`ed-btn ${mode === 'remove' ? 'ed-btn--primary' : 'ed-btn--outline'}`}
            onClick={() => {
              setMode('remove');
              setDirectorId('');
              setWarnSchools([]);
            }}
            disabled={!selectedSchool?.director_id}
          >
            ลบผู้อำนวยการ (TBA)
          </button>
        </div>

        {mode === 'assign' && (
          <>
            <input
              className="form-input"
              placeholder="ค้นหาผู้อำนวยการ"
              value={directorQ}
              onChange={(e) => setDirectorQ(e.target.value)}
            />
            <div className="domain-user-pick" style={{ maxHeight: 'min(280px, 40vh)' }}>
              {filteredDirectors.map((d) => (
                <button
                  key={d.director_id}
                  type="button"
                  className={`domain-user-pick__item ${
                    directorId === d.director_id ? 'domain-user-pick__item--selected' : ''
                  }`}
                  onClick={() => setDirectorId(d.director_id)}
                >
                  <strong>{formatDisplayName(d.name_prefix, d.full_name)}</strong>
                  <span>{d.position_name || 'ผู้อำนวยการโรงเรียน'}</span>
                </button>
              ))}
              {filteredDirectors.length === 0 && (
                <p className="text-sm text-slate-500 m-0 px-1">
                  ไม่พบรายการ —{' '}
                  <Link href="/admin/directors/new" className="text-tm-blue underline">
                    สร้างผู้อำนวยการใหม่
                  </Link>
                </p>
              )}
            </div>

            {selectedDirector ? (
              <div className="report-selected-school" role="status">
                <div className="report-selected-school__head">
                  <span className="report-selected-school__label">
                    ผู้อำนวยการที่เลือกแล้ว
                  </span>
                  <button
                    type="button"
                    className="report-selected-school__clear"
                    aria-label="ยกเลิกการเลือกผู้อำนวยการ"
                    onClick={() => setDirectorId('')}
                  >
                    <X size={14} />
                  </button>
                </div>
                <strong className="report-selected-school__name">
                  {formatDisplayName(
                    selectedDirector.name_prefix,
                    selectedDirector.full_name
                  )}
                </strong>
                <span className="report-selected-school__meta">
                  {selectedDirector.position_name || 'ผู้อำนวยการโรงเรียน'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-amber-700 m-0">ยังไม่ได้เลือกผู้อำนวยการ</p>
            )}

            {warnSchools.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 flex gap-2">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong>ผู้นี้ดูแลอยู่แล้ว {warnSchools.length} โรงเรียน</strong>
                  <ul className="m-0 mt-1 pl-4 list-disc">
                    {warnSchools.map((s) => (
                      <li key={s.school_id}>{s.school_name}</li>
                    ))}
                  </ul>
                  <p className="m-0 mt-1 text-xs">
                    อนุญาตให้ดูแลหลายโรงเรียนได้ — ตรวจซ้ำก่อนยืนยัน
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'remove' && selectedSchool && (
          <p className="text-sm text-amber-900 bg-amber-50 rounded-lg px-3 py-2 m-0">
            จะลบ <strong>{selectedSchool.director_label}</strong> ออกจากโรงเรียนนี้
            และตั้งเป็น {DIRECTOR_TBA_LABEL}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ed-btn ed-btn--primary"
          disabled={
            pending ||
            !schoolId ||
            (mode === 'assign' && !directorId) ||
            (mode === 'remove' && !selectedSchool?.director_id)
          }
          onClick={confirm}
        >
          {pending ? 'กำลังบันทึก…' : 'ยืนยัน'}
        </button>
        <Link href="/admin/directors" className="ed-btn ed-btn--outline">
          ยกเลิก
        </Link>
      </div>
    </div>
  );
}
