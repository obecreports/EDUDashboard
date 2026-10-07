import { HomeLanding } from '@/components/landing/HomeLanding';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const sp = await searchParams;

  return <HomeLanding denied={Boolean(sp?.denied)} />;
}
