import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { fetchSchools } from '@/lib/supabase/schools';
import { isFieldRole, schoolsInScope } from '@/lib/auth/scope';
import { normalizeRole } from '@/lib/types';
import { NewTicketForm } from '@/components/tickets/NewTicketForm';

export const dynamic = 'force-dynamic';

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ school_id?: string; school_name?: string }>;
}) {
  const sp = await searchParams;
  const { profile, isAuthenticated } = await getSessionProfile();
  if (!isAuthenticated || !profile || !isFieldRole(normalizeRole(profile.role))) {
    redirect('/login?next=/tickets/new');
  }

  const all = await fetchSchools();
  const scoped = schoolsInScope(profile, all);

  return (
    <div className="page-shell py-6" style={{ maxWidth: 640 }}>
      <h1 className="ed-section-title mb-2">สร้างคำขอแก้ไขข้อมูล</h1>
      <p className="text-sm text-slate-600 mb-4">
      เพือแก้ไขข้อมูลของโรงเรียน - คำขอจะส่งถึง Admin
      </p>
      <NewTicketForm
        schools={scoped.map((s) => ({
          id: String(s.school_id),
          name: s.school_name_th,
        }))}
        defaultSchoolId={sp.school_id}
        defaultSchoolName={sp.school_name}
      />
    </div>
  );
}
