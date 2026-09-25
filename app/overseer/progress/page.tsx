import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OverseerProgressPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, assigned_zone')
    .eq('role', 'staff');

  const { data: visits } = await supabase
    .from('school_visit_logs')
    .select('id, staff_id, school_id, visit_date, survey_status')
    .order('visit_date', { ascending: false })
    .limit(100);

  const byStaff = new Map<string, typeof visits>();
  for (const v of visits ?? []) {
    const list = byStaff.get(v.staff_id) ?? [];
    list.push(v);
    byStaff.set(v.staff_id, list);
  }

  return (
    <div className="page-shell space-y-6">
      <h1 className="section-heading">ความคืบหน้าเจ้าหน้าที่</h1>
      <p className="text-slate-500 mt-[-0.5rem]">
        ติดตามจาก user_profiles (staff) + school_visit_logs
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(profiles ?? []).map((p) => {
          const recent = (byStaff.get(p.id) ?? []).slice(0, 3);
          return (
            <article key={p.id} className="panel-card">
              <h2 className="font-bold text-tm-blue m-0 mb-1">{p.full_name || p.id}</h2>
              <p className="text-xs text-slate-500 mb-3">เขต: {p.assigned_zone || '—'}</p>
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">3 กิจกรรมล่าสุด</h3>
              {recent.length === 0 ? (
                <p className="text-sm text-slate-400">ยังไม่มีบันทึก</p>
              ) : (
                <ul className="m-0 p-0 list-none space-y-2">
                  {recent.map((v) => (
                    <li key={v.id} className="text-sm rounded-lg bg-slate-50 p-2">
                      School #{v.school_id} · {v.survey_status}
                      <div className="text-xs text-slate-500">
                        {new Date(v.visit_date).toLocaleDateString('th-TH')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
        {(profiles ?? []).length === 0 && (
          <div className="panel-card text-slate-500 col-span-full">
            ยังไม่มี user_profiles บทบาท staff — รัน SQL และสร้างผู้ใช้ใน Auth
          </div>
        )}
      </div>
    </div>
  );
}
