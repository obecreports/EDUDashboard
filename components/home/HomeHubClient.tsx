'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  School,
  Users,
} from 'lucide-react';
import { personAvatarUrl } from '@/lib/schools/images';
import { uploadAndSaveSelfAvatar } from '@/components/home/upload-self-avatar';
import { formatBudgetBaht } from '@/lib/mock/domain-budget';
import type { HomeDomainPanel } from '@/lib/volunteers/directory';
import { roleDisplayLabel, type OverseerTier, type UserRole } from '@/lib/types';

export type HomeStats = {
  schoolCount: number;
  scholarshipCount: number;
  volunteerCount: number | null;
  budgetProjects: number;
  budgetTotal: number;
};

export function HomeHubClient({
  userId,
  displayName,
  role,
  overseerTier,
  avatarUrl,
  stats,
  domain,
}: {
  userId: string;
  displayName: string;
  role: UserRole;
  overseerTier?: OverseerTier | null;
  avatarUrl: string | null;
  stats: HomeStats;
  domain: HomeDomainPanel;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(personAvatarUrl({ avatar_url: avatarUrl }));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [openProvinces, setOpenProvinces] = useState<Record<string, boolean>>({});
  /** Full-project controllers: collapse long province list under "ทั้งโครงการ". */
  const collapseAsWholeProject =
    role === 'super_overseer' || role === 'admin' || role === 'super_admin';
  const [projectOpen, setProjectOpen] = useState(false);

  const roleLabel = roleDisplayLabel(role, overseerTier);

  const hubCards = useMemo(() => {
    const cards: {
      key: string;
      href: string;
      label: string;
      value?: string;
      sub?: string;
      icon: typeof School;
    }[] = [
      {
        key: 'schools',
        href: '/schools',
        label: 'โรงเรียนในขอบเขต',
        value: String(stats.schoolCount),
        icon: School,
      },
      {
        key: 'ss',
        href: '/scholarship-students',
        label: 'นักเรียนทุนฯ',
        value: String(stats.scholarshipCount),
        icon: GraduationCap,
      },
    ];
    if (stats.volunteerCount != null) {
      cards.push({
        key: 'vl',
        href: '/volunteers',
        label: 'อาสาสมัคร',
        value: String(stats.volunteerCount),
        sub: 'ส่วนกลาง + ประจำพื้นที่',
        icon: Users,
      });
    }
    cards.push(
      {
        key: 'budget',
        href: '/budget',
        label: 'งบประมาณ',
        value: `${stats.budgetProjects} โครงการ`,
        sub: formatBudgetBaht(stats.budgetTotal),
        icon: HandCoins,
      },
      {
        key: 'dashboard',
        href: '/dashboard',
        label: 'เปรียบเทียบข้อมูลโรงเรียน',
        value: 'Dashboard',
        sub: 'รายละเอียดด้านใน >',
        icon: LayoutDashboard,
      }
    );
    return cards;
  }, [stats]);

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    setMsg(null);
    start(async () => {
      const res = await uploadAndSaveSelfAvatar(userId, file);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setPreview(res.url);
      setMsg('อัปเดตรูปโปรไฟล์แล้ว');
      router.refresh();
    });
  };

  return (
    <div className="page-shell space-y-8 pb-10">
      <header>
        <p className="text-sm text-slate-500 m-0">{roleLabel}</p>
        <h1 className="section-heading mt-1 mb-0">{displayName}</h1>
        <p className="text-slate-500 mt-1 mb-0">สรุปข้อมูลและเมนูหลัก</p>
      </header>

      <section className="home-hub-stat-row">
        {hubCards.map((c, i) => {
          const Icon = c.icon;
          const tone = (['navy', 'gold', 'white', 'navy'] as const)[i % 4];
          return (
            <Link
              key={c.key}
              href={c.href}
              className={`home-hub-stat home-hub-stat--${tone} home-hub-stat--link`}
            >
              <Icon className="home-hub-stat__bg-icon" size={88} aria-hidden />
              <div className="home-hub-stat__body">
                <p className="home-hub-stat__label">{c.label}</p>
                {c.value ? (
                  <p className="home-hub-stat__value">{c.value}</p>
                ) : null}
                {c.sub ? <p className="home-hub-stat__sub">{c.sub}</p> : null}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel-card flex flex-col items-center gap-4 !p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="h-40 w-40 rounded-2xl object-cover border border-slate-200 bg-slate-50"
          />
          <div className="text-center">
            <p className="font-semibold text-slate-800 m-0">{displayName}</p>
            <p className="text-sm text-slate-500 m-0 mt-1">{roleLabel}</p>
          </div>
          <label className="btn-secondary cursor-pointer text-sm">
            {pending ? 'กำลังอัปโหลด…' : 'อัปโหลดรูปโปรไฟล์'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={pending}
              onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          {msg ? <p className="text-sm text-tm-blue m-0">{msg}</p> : null}
          <Link href="/staff/profile" className="text-sm text-tm-blue font-semibold">
            ตั้งค่าโปรไฟล์เพิ่มเติม →
          </Link>
        </div>

        <div className="panel-card !p-5">
          <h2 className="text-base font-bold text-tm-blue m-0 mb-3">{domain.title}</h2>
          {domain.kind === 'schools' ? (
            domain.schools.length ? (
              <ul className="m-0 p-0 list-none space-y-2">
                {domain.schools.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/schools/${s.id}`}
                      className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:border-tm-blue/40"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 m-0">ยังไม่มีโรงเรียนในขอบเขต</p>
            )
          ) : domain.tree.length ? (
            collapseAsWholeProject ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 bg-slate-50"
                  onClick={() => setProjectOpen((v) => !v)}
                  aria-expanded={projectOpen}
                >
                  <span>
                    ทั้งโครงการ
                    <span className="ml-2 font-normal text-slate-500">
                      ({domain.tree.length} จังหวัด)
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition ${projectOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {projectOpen ? (
                  <ul className="m-0 p-2 list-none space-y-2 bg-white">
                    {domain.tree.map((row) => {
                      const open = Boolean(openProvinces[row.province]);
                      return (
                        <li
                          key={row.province}
                          className="rounded-lg border border-slate-200 overflow-hidden"
                        >
                          <button
                            type="button"
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-800 bg-slate-50"
                            onClick={() =>
                              setOpenProvinces((prev) => ({
                                ...prev,
                                [row.province]: !prev[row.province],
                              }))
                            }
                          >
                            <span>{row.province}</span>
                            <ChevronDown
                              size={16}
                              className={`shrink-0 transition ${open ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {open ? (
                            <ul className="m-0 px-3 py-2 list-disc list-inside text-sm text-slate-600 space-y-1">
                              {row.districts.length ? (
                                row.districts.map((d) => <li key={d}>{d}</li>)
                              ) : (
                                <li className="list-none text-slate-400">
                                  ไม่มีเขตในข้อมูลโรงเรียน
                                </li>
                              )}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : (
              <ul className="m-0 p-0 list-none space-y-2">
                {domain.tree.map((row) => {
                  const open = Boolean(openProvinces[row.province]);
                  return (
                    <li
                      key={row.province}
                      className="rounded-lg border border-slate-200 overflow-hidden"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-800 bg-slate-50"
                        onClick={() =>
                          setOpenProvinces((prev) => ({
                            ...prev,
                            [row.province]: !prev[row.province],
                          }))
                        }
                      >
                        <span>{row.province}</span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 transition ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {open ? (
                        <ul className="m-0 px-3 py-2 list-disc list-inside text-sm text-slate-600 space-y-1">
                          {row.districts.length ? (
                            row.districts.map((d) => <li key={d}>{d}</li>)
                          ) : (
                            <li className="list-none text-slate-400">
                              ไม่มีเขตในข้อมูลโรงเรียน
                            </li>
                          )}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <p className="text-sm text-slate-500 m-0">ยังไม่มีจังหวัดในขอบเขต</p>
          )}
        </div>
      </section>

    </div>
  );
}
