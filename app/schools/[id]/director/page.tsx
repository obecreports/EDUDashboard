import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { fetchSchoolById } from '@/lib/supabase/schools';
import {
  fetchDirectorById,
  fetchDirectorHistory,
} from '@/lib/supabase/directors';
import { DirectorProfileClient } from '@/components/schools/DirectorProfileClient';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export const revalidate = 60;

async function Body({
  schoolId,
  directorIdParam,
}: {
  schoolId: string;
  directorIdParam: string;
}) {
  const school = await fetchSchoolById(schoolId);
  if (!school) notFound();

  // Default: school’s current director; optional ?director= for deep-link
  const directorId = (directorIdParam || school.director_id || '').trim();
  if (!directorId) {
    redirect(`/schools/${schoolId}`);
  }

  const [director, history] = await Promise.all([
    fetchDirectorById(directorId),
    fetchDirectorHistory(directorId),
  ]);

  if (!director) {
    redirect(`/schools/${schoolId}`);
  }

  return (
    <DirectorProfileClient
      schoolId={String(school.school_id)}
      schoolName={school.school_name_th || String(school.school_id)}
      director={director}
      history={history}
    />
  );
}

export default async function SchoolDirectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ director?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const directorIdParam = String(sp.director || '').trim();
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Body schoolId={id} directorIdParam={directorIdParam} />
    </Suspense>
  );
}
