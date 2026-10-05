import { Suspense } from 'react';
import { fetchSchools } from '@/lib/supabase/schools';
import { getSessionProfile } from '@/lib/auth/session';
import { parseAreaIds } from '@/lib/auth/mock-users';
import { readSchoolExtras } from '@/lib/auth/user-store';
import { fetchSchoolExtrasBundle, swotHasContent } from '@/lib/supabase/school-swot';
import { normalizeSchoolSwot } from '@/lib/swot/schema';
import { UpdateSchoolForm } from '@/components/staff/UpdateSchoolForm';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const dynamic = 'force-dynamic';

async function UpdateSchoolBody({ schoolId }: { schoolId?: string }) {
  const [{ profile }, schools] = await Promise.all([getSessionProfile(), fetchSchools()]);
  const assigned = new Set(parseAreaIds(profile?.assigned_zone));
  const hasScope = assigned.size > 0;

  const options = schools.slice(0, 400).map((s) => {
    const area_id = String(s.area_id || '');
    const editable = hasScope ? assigned.has(area_id) : false;
    return {
      id: Number(s.school_id),
      name: s.school_name_th,
      area_id,
      area_name: s.area_name || '',
      province: s.province || '',
      editable,
    };
  });

  const editable = options.filter((o) => o.editable);
  const dbBundle = await fetchSchoolExtrasBundle(editable.map((s) => s.id));

  const extrasBySchool: Record<
    string,
    {
      swot: ReturnType<typeof readSchoolExtras>['swot'];
      comments: ReturnType<typeof readSchoolExtras>['comments'];
    }
  > = {};

  editable.forEach((s) => {
    const key = String(s.id);
    const cookie = readSchoolExtras(s.id);
    const db = dbBundle[key];
    const dbSwot = db?.swot ? normalizeSchoolSwot(db.swot) : null;

    extrasBySchool[key] = {
      swot: dbSwot && swotHasContent(dbSwot) ? dbSwot : normalizeSchoolSwot(cookie.swot),
      comments: db?.comments?.length ? db.comments : cookie.comments,
    };
  });

  return (
    <div className="page-shell" style={{ maxWidth: 760 }}>
      <h1 className="section-heading">อัปเดตข้อมูลโรงเรียน</h1>
      <p className="text-slate-500 mt-[-0.5rem] mb-4">
        แก้ไข SWOT (จุดแข็ง / จุดอ่อน / โอกาส / อุปสรรค) และบันทึกความคิดเห็นสำหรับโรงเรียนในเขตที่รับผิดชอบ ·
        แก้ไขได้ {editable.length} โรงเรียน
      </p>
      <UpdateSchoolForm
        schools={options}
        initialSchoolId={schoolId}
        extrasBySchool={extrasBySchool}
      />
    </div>
  );
}

export default function UpdateSchoolPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <UpdateSchoolBody schoolId={searchParams?.id} />
    </Suspense>
  );
}
