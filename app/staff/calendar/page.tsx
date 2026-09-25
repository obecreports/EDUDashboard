import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function StaffCalendarPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const { data: visits } = await supabase
    .from('school_visit_logs')
    .select('id, school_id, visit_date, survey_status, notes')
    .order('visit_date', { ascending: true })
    .limit(30);

  return (
    <div className="page-shell">
      <h1 className="section-heading">ปฏิทิน / ตารางลงพื้นที่</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        ดึงจาก school_visit_logs · ผู้ใช้: {profile?.full_name}
      </p>
      <div className="panel-card space-y-2">
        {(visits ?? []).length === 0 && (
          <p className="text-slate-500 text-sm">ยังไม่มีนัดหมายในฐานข้อมูล</p>
        )}
        {(visits ?? []).map((v) => (
          <div key={v.id} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm">
            <div>
              <strong>School #{v.school_id}</strong>
              <div className="text-slate-500">{v.notes || '—'}</div>
            </div>
            <div className="text-right">
              <div>{new Date(v.visit_date).toLocaleString('th-TH')}</div>
              <span className="text-xs font-semibold text-tm-seafoam-dark">{v.survey_status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
