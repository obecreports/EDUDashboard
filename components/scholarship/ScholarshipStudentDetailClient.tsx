'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  FileDown,
  HeartPulse,
  Pencil,
  Phone,
  School,
  ShieldAlert,
  Users,
  Wallet,
  UserRound,
  History,
  UserPlus,
} from 'lucide-react';
import type { ContentResourceId } from '@/lib/auth/content-access';
import {
  DEFAULT_SCHOLARSHIP_PHOTO,
  type ScholarshipFamilyMember,
  type ScholarshipStudent,
} from '@/lib/mock/scholarship-students';
import { exportElementToPdf } from '@/lib/scholarship/export-pdf';
import {
  SCHOLARSHIP_SECTION_ORDER,
  fieldsForSection,
  type ScholarshipFieldKey,
} from '@/lib/scholarship/field-meta';

const SECTION_THEME: Partial<
  Record<
    ContentResourceId,
    { tint: string; icon: typeof UserRound; title: string }
  >
> = {
  ss_general: {
    tint: 'ss-card--blue',
    icon: UserRound,
    title: 'ข้อมูลทั่วไป',
  },
  ss_contact: {
    tint: 'ss-card--purple',
    icon: Phone,
    title: 'ติดต่อ',
  },
  ss_teacher: {
    tint: 'ss-card--teal',
    icon: School,
    title: 'ครู / ผู้ดูแล',
  },
  ss_performance: {
    tint: 'ss-card--navy',
    icon: BookOpen,
    title: 'ผลการเรียน',
  },
  ss_behavior: {
    tint: 'ss-card--amber',
    icon: ShieldAlert,
    title: 'พฤติกรรม / ความเสี่ยง',
  },
  ss_health: {
    tint: 'ss-card--rose',
    icon: HeartPulse,
    title: 'สุขภาพ',
  },
  ss_fund: {
    tint: 'ss-card--gold',
    icon: Wallet,
    title: 'ทุน / การเบิกจ่าย',
  },
  ss_project: {
    tint: 'ss-card--green',
    icon: History,
    title: 'ประวัติโครงการ',
  },
  ss_friends: {
    tint: 'ss-card--cyan',
    icon: UserPlus,
    title: 'เพื่อน',
  },
  ss_family: {
    tint: 'ss-card--violet',
    icon: Users,
    title: 'ครอบครัว',
  },
};

function fmt(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่ใช่';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('th-TH')
      : value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  }
  return String(value);
}

function studentValue(
  student: ScholarshipStudent,
  key: ScholarshipFieldKey
): unknown {
  if (key === 'average_gpa') return student.average_gpa ?? student.gpa;
  if (key === 'full_name') {
    return [student.name_prefix, student.full_name].filter(Boolean).join(' ');
  }
  return (student as unknown as Record<string, unknown>)[key];
}

function memberValue(
  member: ScholarshipFamilyMember,
  key: ScholarshipFieldKey
): unknown {
  const map: Partial<Record<ScholarshipFieldKey, keyof ScholarshipFamilyMember>> =
    {
      fm_relationship: 'relationship',
      fm_full_name: 'full_name',
      fm_age: 'age',
      fm_race: 'race',
      fm_nationality: 'nationality',
      fm_tribe: 'tribe',
      fm_highest_education: 'highest_education',
      fm_occupation: 'occupation',
      fm_monthly_income: 'monthly_income',
      fm_current_address: 'current_address',
      fm_national_id: 'national_id',
      fm_phone: 'phone',
    };
  const prop = map[key];
  return prop ? member[prop] : undefined;
}

export function ScholarshipStudentDetailClient({
  student: initial,
  visibleKeys,
  editableKeys,
  canEdit,
}: {
  student: ScholarshipStudent;
  visibleKeys: ScholarshipFieldKey[];
  editableKeys: ScholarshipFieldKey[];
  canEdit: boolean;
}) {
  const [student, setStudent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pdfPending, setPdfPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const visible = useMemo(() => new Set(visibleKeys), [visibleKeys]);
  const editable = useMemo(() => new Set(editableKeys), [editableKeys]);

  const canSee = (key: ScholarshipFieldKey) => visible.has(key);
  const canChange = (key: ScholarshipFieldKey) => editable.has(key);

  const displayName = [student.name_prefix, student.full_name]
    .filter(Boolean)
    .join(' ');
  const photo = student.photo_url || DEFAULT_SCHOLARSHIP_PHOTO;
  const isTerminated = student.status === 'พ้นสภาพ';

  const setScalar = (key: ScholarshipFieldKey, value: string) => {
    setStudent((prev) => {
      const next: ScholarshipStudent = { ...prev };
      const bag = next as unknown as Record<string, unknown>;
      if (
        key === 'average_gpa' ||
        key === 'annual_family_income' ||
        key === 'remaining_budget' ||
        key === 'disbursed' ||
        key === 'tuition_fee_disbursed' ||
        key === 'individual_disbursement' ||
        key === 'total_scholarship'
      ) {
        bag[key] = value === '' ? undefined : Number(value);
        if (key === 'average_gpa') next.gpa = next.average_gpa;
      } else if (key === 'can_contact_supervisor') {
        next.can_contact_supervisor = value === 'true';
      } else if (key === 'full_name') {
        next.full_name = value;
      } else {
        bag[key] = value;
      }
      return next;
    });
  };

  const renderField = (key: ScholarshipFieldKey, label: string) => {
    if (!canSee(key)) return null;
    const value = studentValue(student, key);
    const editingThis = editing && canChange(key);
    return (
      <div key={key} className="ss-field">
        <dt>{label}</dt>
        <dd>
          {editingThis ? (
            key === 'can_contact_supervisor' ? (
              <select
                className="form-input text-sm"
                value={value ? 'true' : 'false'}
                onChange={(e) => setScalar(key, e.target.value)}
              >
                <option value="true">ใช่</option>
                <option value="false">ไม่ใช่</option>
              </select>
            ) : (
              <input
                className="form-input text-sm"
                value={value == null ? '' : String(value)}
                onChange={(e) => setScalar(key, e.target.value)}
              />
            )
          ) : (
            fmt(value)
          )}
        </dd>
      </div>
    );
  };

  const renderSectionFields = (
    section: ContentResourceId,
    familyMember = false
  ) => {
    const fields = fieldsForSection(section, { familyMember });
    const nodes = fields
      .map((f) => renderField(f.key, f.label))
      .filter(Boolean);
    return nodes;
  };

  return (
    <div className="ss-profile space-y-4">
      <div
        className="flex flex-wrap gap-3 items-center justify-between"
        data-html2canvas-ignore="true"
      >
        <Link
          href="/scholarship-students"
          className="text-sm text-tm-blue font-semibold underline"
        >
          ← กลับรายการนักเรียนทุน
        </Link>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <button
              type="button"
              className="ed-btn ed-btn--primary inline-flex items-center gap-1.5"
              onClick={() => {
                if (editing) {
                  setMsg('บันทึกจำลองแล้ว (ยังไม่เชื่อมฐานข้อมูล)');
                  setEditing(false);
                } else {
                  setMsg(null);
                  setEditing(true);
                }
              }}
            >
              <Pencil size={16} />
              {editing ? 'บันทึก' : 'แก้ไข'}
            </button>
          ) : null}
          <button
            type="button"
            className="ed-btn inline-flex items-center gap-1.5"
            disabled={pdfPending}
            onClick={() => {
              const el = document.getElementById('scholarship-profile-print');
              if (!el) return;
              setPdfPending(true);
              setMsg(null);
              void exportElementToPdf(
                el,
                `${student.student_code}-${displayName}`
              )
                .then(() => setMsg('ส่งออก PDF เรียบร้อย'))
                .catch(() => setMsg('ส่งออก PDF ไม่สำเร็จ'))
                .finally(() => setPdfPending(false));
            }}
          >
            <FileDown size={16} />
            {pdfPending ? 'กำลังสร้าง PDF…' : 'ส่งออก PDF'}
          </button>
        </div>
      </div>

      {msg ? (
        <p className="text-sm text-slate-600 m-0" data-html2canvas-ignore="true">
          {msg}
        </p>
      ) : null}

      <div id="scholarship-profile-print" className="ss-profile__print space-y-4">
        {/* Banner */}
        <section className="ss-banner ed-card">
          <div className="ss-banner__grid">
            {canSee('photo_url') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={displayName}
                className="ss-banner__photo"
              />
            ) : (
              <div className="ss-banner__photo ss-banner__photo--empty" />
            )}
            <div className="ss-banner__main">
              {canSee('full_name') ? (
                editing && canChange('full_name') ? (
                  <input
                    className="form-input text-xl font-bold"
                    value={student.full_name}
                    onChange={(e) => setScalar('full_name', e.target.value)}
                  />
                ) : (
                  <h1 className="ss-banner__name">{displayName}</h1>
                )
              ) : null}
              {canSee('student_code') ? (
                <p className="ss-banner__id m-0">
                  รหัสนักเรียน {fmt(student.student_code)}
                </p>
              ) : null}
              <div className="ss-banner__pills">
                {canSee('grade_level') ? (
                  <span className="ss-pill ss-pill--blue">
                    <Briefcase size={14} /> {fmt(student.grade_level)}
                  </span>
                ) : null}
                {canSee('generation') ? (
                  <span className="ss-pill ss-pill--amber">
                    {fmt(student.generation)}
                  </span>
                ) : null}
                {canSee('school_name') ? (
                  <span className="ss-pill ss-pill--teal">
                    <School size={14} /> {fmt(student.school_name)}
                  </span>
                ) : null}
                {canSee('status') ? (
                  <span
                    className={`ss-pill ${
                      isTerminated ? 'ss-pill--rose' : 'ss-pill--green'
                    }`}
                  >
                    {fmt(student.status)}
                  </span>
                ) : null}
              </div>
              {isTerminated && canSee('terminated_remark_1') ? (
                <p className="text-sm m-0 mt-2 text-slate-600">
                  หมายเหตุ 1: {fmt(student.terminated_remark_1)}
                </p>
              ) : null}
              {isTerminated && canSee('terminated_remark_2') ? (
                <p className="text-sm m-0 text-slate-600">
                  หมายเหตุ 2: {fmt(student.terminated_remark_2)}
                </p>
              ) : null}
              {canSee('overseer_level') ? (
                <p className="text-sm m-0 mt-2 font-medium text-tm-blue">
                  ผู้ดูแล: {fmt(student.overseer_level)}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="ss-sections">
          {SCHOLARSHIP_SECTION_ORDER.map((sectionId) => {
            if (sectionId === 'ss_family') {
              const household = renderSectionFields('ss_family', false);
              const memberFields = fieldsForSection('ss_family', {
                familyMember: true,
              }).filter((f) => canSee(f.key));
              const showFamily =
                household.length > 0 ||
                (memberFields.length > 0 && student.family_members.length > 0);
              if (!showFamily) return null;
              const theme = SECTION_THEME.ss_family!;
              const Icon = theme.icon;
              return (
                <section
                  key={sectionId}
                  className={`ss-card ed-card ${theme.tint}`}
                >
                  <header className="ss-card__head">
                    <Icon size={18} />
                    <h2>{theme.title}</h2>
                  </header>
                  {household.length > 0 ? (
                    <dl className="ss-fields">{household}</dl>
                  ) : null}
                  {memberFields.length > 0 && student.family_members.length > 0 ? (
                    <div className="ss-family-grid">
                      {student.family_members.map((member) => (
                        <article key={member.id} className="ss-family-card">
                          <h3 className="ss-family-card__title">
                            {canSee('fm_relationship')
                              ? fmt(member.relationship)
                              : 'สมาชิกครอบครัว'}
                            {canSee('fm_full_name')
                              ? ` · ${fmt(member.full_name)}`
                              : ''}
                          </h3>
                          <dl className="ss-fields">
                            {memberFields.map((f) => {
                              if (f.key === 'fm_relationship' || f.key === 'fm_full_name')
                                return null;
                              const val = memberValue(member, f.key);
                              return (
                                <div key={f.key} className="ss-field">
                                  <dt>{f.label}</dt>
                                  <dd>{fmt(val)}</dd>
                                </div>
                              );
                            })}
                          </dl>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            }

            const nodes = renderSectionFields(sectionId, false);
            if (nodes.length === 0) return null;
            const theme = SECTION_THEME[sectionId];
            if (!theme) return null;
            const Icon = theme.icon;
            return (
              <section
                key={sectionId}
                className={`ss-card ed-card ${theme.tint}`}
              >
                <header className="ss-card__head">
                  <Icon size={18} />
                  <h2>{theme.title}</h2>
                </header>
                <dl className="ss-fields">{nodes}</dl>
              </section>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 m-0 pt-1">
          <Link
            href={`/schools/${student.school_id}`}
            className="text-tm-blue underline"
          >
            ไปที่หน้ารายละเอียดโรงเรียน
          </Link>
        </p>
      </div>
    </div>
  );
}
