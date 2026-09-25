import { notFound } from 'next/navigation';
import { fetchSchoolById } from '@/lib/supabase/schools';

export const dynamic = 'force-dynamic';

export default async function SchoolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const school = await fetchSchoolById(id);
  if (!school) notFound();

  return (
    <div className="page-shell" style={{ maxWidth: 800 }}>
      <h1 className="section-heading">{school.school_name_th}</h1>
      <div className="panel-card space-y-3">
        <p><strong>จังหวัด:</strong> {school.province} · <strong>อำเภอ:</strong> {school.district}</p>
        <p><strong>ตำบล:</strong> {school.subdistrict} · <strong>เขต:</strong> {school.area_name || school.area_id}</p>
        <p><strong>ขนาด:</strong> {school.school_size} · <strong>โทร:</strong> {school.phone || '—'}</p>
        <p><strong>พิกัด:</strong> {school.latitude}, {school.longitude}</p>
        <p><strong>นักเรียน:</strong> {(school.studentSummary?.totalStudents ?? 0).toLocaleString()}</p>
        <p><strong>ครู:</strong> {(school.personnelSummary?.totalPersonnel ?? 0).toLocaleString()}</p>
        <p><strong>คะแนนรวม:</strong> {(school.overallScore ?? 0).toFixed(2)}</p>
      </div>
    </div>
  );
}
