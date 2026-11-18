'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin, Users } from 'lucide-react';

export type OverseerRosterItem = {
  id: string;
  name: string;
  namePrefix?: string | null;
  position: string;
  provinces: string[];
};

type Props = {
  overseers: OverseerRosterItem[];
  provinceCounts: Record<string, number>;
};

export function OverseersRoster({ overseers, provinceCounts }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...overseers].sort((a, b) =>
        a.name.localeCompare(b.name, 'th')
      ),
    [overseers]
  );

  if (!sorted.length) return null;

  return (
    <section className="about-overseers" aria-label="องคมนตรี">
      <div className="about-overseers__head">
        <div className="about-mock__icon">
          <Users size={22} />
        </div>
        <div>
          <h2 className="m-0">องคมนตรี</h2>
          <p className="m-0 mt-1 text-sm text-slate-600">
            คลิกชื่อเพื่อดูจังหวัดในความดูแล และจำนวนโรงเรียนในโครงการ
          </p>
        </div>
      </div>

      <ul className="about-overseers__list">
        {sorted.map((ov) => {
          const open = openId === ov.id;
          const displayName = [ov.namePrefix, ov.name].filter(Boolean).join(' ');
          return (
            <li key={ov.id} className={`about-overseers__item${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="about-overseers__toggle"
                aria-expanded={open}
                onClick={() => setOpenId((cur) => (cur === ov.id ? null : ov.id))}
              >
                <span className="about-overseers__name">
                  <strong>{displayName}</strong>
                  {ov.position ? (
                    <span className="about-overseers__position">{ov.position}</span>
                  ) : null}
                </span>
                <span className="about-overseers__meta">
                  {ov.provinces.length} จังหวัด
                  <ChevronDown size={18} className="about-overseers__chevron" />
                </span>
              </button>
              {open && (
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
                    <li className="about-overseers__empty">ยังไม่ระบุจังหวัดในความดูแล</li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
