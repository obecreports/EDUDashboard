import { fetchSchools } from '@/lib/supabase/schools';
import { UpdateSchoolForm } from '@/components/staff/UpdateSchoolForm';

export const dynamic = 'force-dynamic';

export default async function UpdateSchoolPage() {
  const schools = await fetchSchools();
  const options = schools.slice(0, 200).map((s) => ({
    id: Number(s.school_id),
    name: s.school_name_th,
  }));

  return (
    <div className="page-shell" style={{ maxWidth: 720 }}>
      <h1 className="section-heading">อัปเดตข้อมูลโรงเรียน</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        บันทึกลง school_visit_logs (สถานะสำรวจ / หมายเหตุ / รูป)
      </p>
      <UpdateSchoolForm schools={options} />
    </div>
  );
}
