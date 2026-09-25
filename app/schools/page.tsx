import Link from 'next/link';
import { fetchSchools } from '@/lib/supabase/schools';

export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const schools = await fetchSchools();

  return (
    <div className="page-shell">
      <h1 className="section-heading">รายชื่อโรงเรียน</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">{schools.length} โรงเรียน จาก School_Basic</p>
      <div className="panel-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--tm-blue-50)', color: 'var(--tm-blue)' }}>
            <tr>
              <th className="text-left p-3">ชื่อโรงเรียน</th>
              <th className="text-left p-3">จังหวัด</th>
              <th className="text-left p-3">อำเภอ</th>
              <th className="text-left p-3">ขนาด</th>
              <th className="text-left p-3">นักเรียน</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={String(s.school_id)} className="border-t border-slate-100">
                <td className="p-3">
                  <Link href={`/schools/${s.school_id}`} className="font-medium text-tm-blue hover:underline">
                    {s.school_name_th}
                  </Link>
                </td>
                <td className="p-3">{s.province}</td>
                <td className="p-3">{s.district}</td>
                <td className="p-3">{s.school_size}</td>
                <td className="p-3">{(s.studentSummary?.totalStudents ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
