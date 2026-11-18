'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  MapPin,
  School,
  Users,
} from 'lucide-react';
import { personAvatarUrl } from '@/lib/schools/images';
import { ROLE_LABELS } from '@/lib/types';

export type OverseerRosterItem = {
  id: string;
  name: string;
  namePrefix?: string | null;
  position: string;
  provinces: string[];
  avatarUrl?: string | null;
  volunteerCenterCount: number;
  volunteerBorderCount: number;
  schoolCount: number;
  studentCount: number;
};

type Props = {
  overseers: OverseerRosterItem[];
  provinceCounts: Record<string, number>;
};

export function OverseersRoster({ overseers, provinceCounts }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  /** Keep server order (ประธานองคมนตรี first); only fall back to Thai name sort if needed */
  const sorted = useMemo(() => [...overseers], [overseers]);

  if (!sorted.length) return null;

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="about-overseers" aria-label="องคมนตรี">
      <div className="about-overseers__head">
        <div className="about-mock__icon">
          <Users size={22} />
        </div>
        <div>
          <h2 className="m-0">องคมนตรี</h2>
          <p className="m-0 mt-1 text-sm text-slate-600">
            คลิกการ์ดเพื่อดูจังหวัด อาสาสมัคร โรงเรียน และนักเรียนในความดูแล
          </p>
        </div>
      </div>

      <ul className="about-overseers__grid">
        {sorted.map((ov) => {
          const open = openIds.has(ov.id);
          const displayName = [ov.namePrefix, ov.name].filter(Boolean).join(' ');
          const photo = personAvatarUrl({ avatar_url: ov.avatarUrl });
          return (
            <li
              key={ov.id}
              className={`about-overseers__card${open ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="about-overseers__card-toggle"
                aria-expanded={open}
                onClick={() => toggle(ov.id)}
              >
                <span className="about-overseers__photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt=""
                    className="about-overseers__photo"
                  />
                </span>
                <span className="about-overseers__card-text">
                  <strong>{displayName}</strong>
                  {ov.position ? (
                    <span className="about-overseers__position">{ov.position}</span>
                  ) : null}
                </span>
              </button>
              {open ? (
                <div className="about-overseers__card-body">
                  <div className="about-overseers__stats">
                    <div>
                      <em>{ROLE_LABELS.volunteer_center}</em>
                      <strong>
                        {ov.volunteerCenterCount.toLocaleString('th-TH')} คน
                      </strong>
                    </div>
                    <div>
                      <em>{ROLE_LABELS.volunteer_border}</em>
                      <strong>
                        {ov.volunteerBorderCount.toLocaleString('th-TH')} คน
                      </strong>
                    </div>
                    <div>
                      <em>
                        <School size={14} className="inline" /> โรงเรียน
                      </em>
                      <strong>
                        {ov.schoolCount.toLocaleString('th-TH')} แห่ง
                      </strong>
                    </div>
                    <div>
                      <em>
                        <GraduationCap size={14} className="inline" /> นักเรียน
                      </em>
                      <strong>
                        {ov.studentCount.toLocaleString('th-TH')} คน
                      </strong>
                    </div>
                  </div>
                  <h3 className="about-overseers__prov-title">จังหวัดในความดูแล</h3>
                  <ul className="about-overseers__provinces">
                    {ov.provinces.length ? (
                      ov.provinces.map((province) => {
                        const count = provinceCounts[province] ?? 0;
                        return (
                          <li key={province}>
                            <Link
                              href={`/schools?province=${encodeURIComponent(province)}`}
                              className="about-overseers__province-link"
                            >
                              <MapPin size={15} />
                              <span>{province}</span>
                              <strong>
                                {count.toLocaleString('th-TH')} โรงเรียน
                              </strong>
                            </Link>
                          </li>
                        );
                      })
                    ) : (
                      <li className="about-overseers__empty">
                        ยังไม่ระบุจังหวัดในความดูแล
                      </li>
                    )}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
