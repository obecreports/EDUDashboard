'use client';

import Link from 'next/link';
import type { ContractTeacher } from '@/lib/mock/contract-teachers';
import { formatThaiDate } from '@/lib/format/date';

export function ContractTeacherDetailClient({
  teacher,
  canModify,
}: {
  teacher: ContractTeacher;
  canModify: boolean;
}) {
  const name = [teacher.name_prefix, teacher.full_name].filter(Boolean).join(' ');
  const rows: { label: string; value: string }[] = [
    { label: 'รหัส', value: teacher.id },
    { label: 'เพศ', value: teacher.gender },
    { label: 'ตำแหน่ง', value: teacher.position },
    { label: 'วิชาที่สอน', value: teacher.subject || '—' },
    { label: 'โรงเรียน', value: teacher.school_name },
    { label: 'อำเภอ', value: teacher.district },
    { label: 'จังหวัด', value: teacher.province },
    { label: 'ประเภทสัญญา', value: teacher.contract_type },
    { label: 'เริ่มสัญญา', value: formatThaiDate(teacher.start_date) },
    {
      label: 'สิ้นสุดสัญญา',
      value: teacher.end_date ? formatThaiDate(teacher.end_date) : '—',
    },
    { label: 'สถานะ', value: teacher.status },
    { label: 'โทรศัพท์', value: teacher.phone || '—' },
    { label: 'หมายเหตุ', value: teacher.notes || '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Link
          href="/contract-teachers"
          className="text-sm text-tm-blue font-semibold underline"
        >
          ← กลับรายการครูอัตรจ้าง
        </Link>
        {canModify ? (
          <span className="text-xs text-tm-blue font-semibold">
            สิทธิ์แก้ไข (mock — ยังไม่มีฟอร์มบันทึก)
          </span>
        ) : null}
      </div>

      <section className="ed-card p-5 space-y-3">
        <h2 className="ed-section-title m-0 text-lg">{name}</h2>
        <p className="text-sm text-slate-600 m-0">
          {teacher.contract_type} · {teacher.status}
        </p>
        <dl className="grid gap-2 sm:grid-cols-2 m-0">
          {rows.map((r) => (
            <div key={r.label} className="border-b border-slate-100 py-2">
              <dt className="text-xs text-slate-500 m-0">{r.label}</dt>
              <dd className="m-0 font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500 m-0 pt-2">
          <Link
            href={`/schools/${teacher.school_id}`}
            className="text-tm-blue underline"
          >
            ไปที่หน้ารายละเอียดโรงเรียน
          </Link>
        </p>
      </section>
    </div>
  );
}
