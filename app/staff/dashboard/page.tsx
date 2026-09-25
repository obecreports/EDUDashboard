import Link from 'next/link';
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardPen } from 'lucide-react';
import { getSessionProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function StaffDashboardPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const { data: visits } = await supabase
    .from('school_visit_logs')
    .select('id, school_id, visit_date, survey_status, notes')
    .eq('staff_id', profile?.id === 'demo' ? '00000000-0000-0000-0000-000000000000' : profile?.id ?? '')
    .order('visit_date', { ascending: false })
    .limit(5);

  const visitRows = visits ?? [];

  return (
    <div className="page-shell space-y-8">
      <header>
        <h1 className="section-heading">สวัสดี, {profile?.full_name ?? 'เจ้าหน้าที่'}</h1>
        <p className="text-slate-500 mt-[-0.5rem]">
          {profile?.position || 'Staff'}
          {profile?.assigned_zone ? ` · เขต ${profile.assigned_zone}` : ''}
        </p>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <div className="kpi-card__icon">
            <CalendarDays size={22} />
          </div>
          <div>
            <div className="kpi-card__label">บันทึกการเยี่ยมล่าสุด</div>
            <div className="kpi-card__value">{visitRows.length}</div>
            <div className="kpi-card__hint">จาก school_visit_logs</div>
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--seafoam">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="kpi-card__label">Surveyed</div>
            <div className="kpi-card__value">
              {visitRows.filter((v) => v.survey_status === 'Surveyed').length}
            </div>
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-card__icon">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="kpi-card__label">Pending / Inactive</div>
            <div className="kpi-card__value">
              {visitRows.filter((v) => v.survey_status === 'Pending' || v.survey_status === 'Inactive').length}
            </div>
          </div>
        </article>
      </div>

      <section className="panel-card">
        <h2 className="section-heading text-base">กิจกรรมล่าสุด</h2>
        {visitRows.length === 0 ? (
          <p className="text-slate-500 text-sm">
            ยังไม่มีข้อมูลใน school_visit_logs — รัน SQL migration แล้วลงพื้นที่ผ่านหน้าอัปเดตโรงเรียน
          </p>
        ) : (
          <ul className="space-y-2 m-0 p-0 list-none">
            {visitRows.map((v) => (
              <li key={v.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <strong>School #{v.school_id}</strong> · {v.survey_status}
                <div className="text-slate-500">{new Date(v.visit_date).toLocaleString('th-TH')}</div>
                {v.notes && <div>{v.notes}</div>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/staff/calendar" className="navbar__login">
            ปฏิทิน
          </Link>
          <Link href="/staff/update-school" className="navbar__login" style={{ background: 'var(--tm-seafoam)', color: 'var(--tm-blue-deeper)' }}>
            <ClipboardPen size={16} />
            อัปเดตโรงเรียน
          </Link>
          <Link href="/staff/profile" className="navbar__link">
            โปรไฟล์
          </Link>
        </div>
      </section>
    </div>
  );
}
