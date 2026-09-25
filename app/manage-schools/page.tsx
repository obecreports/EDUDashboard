import { fetchSchools } from '@/lib/supabase/schools';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function ManageSchoolsPage() {
  const { role, profile } = await getSessionProfile();
  const schools = await fetchSchools(
    role === 'staff' && profile?.assigned_zone
      ? { zone: profile.assigned_zone }
      : undefined
  );
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from('user_profiles')
    .select('id, full_name, assigned_zone, role')
    .in('role', ['staff', 'overseer']);

  const canAssign = role === 'overseer' || role === 'admin';

  return (
    <div className="page-shell">
      <h1 className="section-heading">
        {canAssign ? 'จัดการโรงเรียน / มอบหมายเขต' : 'โรงเรียนในความรับผิดชอบ'}
      </h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        กรองจาก School_Basic.zone · บทบาท {role}
      </p>

      {canAssign && (
        <div className="panel-card mb-4">
          <h2 className="font-bold text-tm-blue mb-2">เจ้าหน้าที่ (user_profiles)</h2>
          <ul className="text-sm space-y-1 m-0 p-0 list-none">
            {(staff ?? []).map((s) => (
              <li key={s.id}>
                {s.full_name} · {s.role} · เขต {s.assigned_zone || '—'}
              </li>
            ))}
            {(staff ?? []).length === 0 && <li className="text-slate-400">ยังไม่มีข้อมูล</li>}
          </ul>
        </div>
      )}

      <div className="panel-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}>
            <tr>
              <th className="text-left p-3">โรงเรียน</th>
              <th className="text-left p-3">จังหวัด</th>
              <th className="text-left p-3">zone</th>
              <th className="text-left p-3">area_id</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={String(s.school_id)} className="border-t border-slate-100">
                <td className="p-3">{s.school_name_th}</td>
                <td className="p-3">{s.province}</td>
                <td className="p-3">{s.zone || '—'}</td>
                <td className="p-3">{s.area_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
