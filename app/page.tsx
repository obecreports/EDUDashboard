import { fetchSchools, formatFetchError } from '@/lib/supabase/schools';
import { AboutProjectView } from '@/components/landing/AboutProjectView';

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const sp = await searchParams;

  let schools: Awaited<ReturnType<typeof fetchSchools>> = [];
  let errorMsg: string | null = null;
  try {
    schools = await fetchSchools();
  } catch (e: unknown) {
    errorMsg = formatFetchError(e);
  }

  const totalSchools = schools.length || 143;
  const totalStudents =
    schools.reduce((s, x) => s + (x.studentSummary?.totalStudents ?? 0), 0) || 48732;
  const provinces = new Set(schools.map((s) => s.province).filter(Boolean)).size || 56;

  return (
    <AboutProjectView
      totalSchools={totalSchools}
      provinces={provinces}
      volunteers={62}
      totalStudents={totalStudents}
      denied={Boolean(sp?.denied)}
      errorMsg={errorMsg}
    />
  );
}
