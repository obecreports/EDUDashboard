'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, BookOpen, Hexagon, Map, School } from 'lucide-react';
import { PAGE_BANNERS } from '@/lib/types';

const EXPLORE = [
  {
    href: '/about',
    label: 'เกี่ยวกับโครงการ',
    desc: 'ความเป็นมา เป้าหมาย และผู้มีส่วนร่วม',
    icon: BookOpen,
  },
  {
    href: '/strategy',
    label: 'ภาพรวม 5 กลยุทธ์',
    desc: 'คะแนนเฉลี่ยและการกระจายสถานะ',
    icon: Hexagon,
  },
  {
    href: '/thailand-map',
    label: 'แผนที่',
    desc: 'สำรวจโรงเรียนตามพื้นที่',
    icon: Map,
  },
  {
    href: '/schools',
    label: 'โรงเรียนในความดูแล',
    desc: 'รายชื่อและข้อมูลโรงเรียน',
    icon: School,
  },
] as const;

export function HomeLanding({ denied }: { denied?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nodes = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="home-landing" ref={rootRef}>
      {denied && (
        <div className="page-shell pt-4">
          <div className="ed-card p-3 text-amber-800 bg-amber-50 border-amber-200">
            ไม่มีสิทธิ์เข้าถึงหน้านี้ — กรุณาเข้าสู่ระบบด้วยบทบาทที่เหมาะสม
          </div>
        </div>
      )}

      <section className="home-landing__hero" aria-label="หน้าแรก">
        <div
          className="home-landing__media"
          aria-hidden
          style={{ backgroundImage: `url(${PAGE_BANNERS.about})` }}
        />
        <div className="home-landing__veil" aria-hidden />

        <div className="home-landing__hero-inner">
          <p className="home-landing__brand">โครงการกองทุนการศึกษา</p>
          <h1 className="home-landing__title">สร้างคนดีให้บ้านเมือง</h1>
          <p className="home-landing__lead">
            ระบบติดตามและพัฒนาคุณภาพโรงเรียนในโครงการกองทุนการศึกษา
          </p>
          <div className="home-landing__cta">
            <Link href="/about" className="ed-btn ed-btn--primary">
              เกี่ยวกับโครงการ <ArrowRight size={18} />
            </Link>
            <Link href="/strategy" className="ed-btn ed-btn--outline home-landing__cta-ghost">
              ภาพรวม 5 กลยุทธ์ <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="home-landing__scroll" aria-hidden>
          <span />
        </div>
      </section>

      <section className="home-landing__mission" data-reveal>
        <div className="home-landing__mission-inner">
          <p className="home-landing__kicker">พันธกิจ</p>
          <h2>
            พัฒนาคุณภาพการศึกษาอย่างเป็นระบบ
            <span>เพื่อโอกาสที่ยั่งยืนของเด็กไทย</span>
          </h2>
          <p>
            ติดตามโรงเรียนในความดูแล วัดผลกลยุทธ์ และเชื่อมโยงพื้นที่จริงบนแผนที่
            เพื่อให้ทีมงานเห็นภาพรวมและลงมือได้ตรงจุด
          </p>
        </div>
      </section>

      <section className="home-landing__explore" aria-label="สำรวจเมนู">
        <div className="home-landing__explore-head" data-reveal>
          <p className="home-landing__kicker">เริ่มสำรวจ</p>
          <h2>เลือกมุมมองที่ต้องการ</h2>
        </div>

        <ul className="home-landing__list">
          {EXPLORE.map((item, i) => (
            <li key={item.href} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
              <Link href={item.href} className="home-landing__row">
                <span className="home-landing__row-icon" aria-hidden>
                  <item.icon size={22} />
                </span>
                <span className="home-landing__row-copy">
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </span>
                <ArrowRight className="home-landing__row-arrow" size={18} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-landing__close" data-reveal>
        <div className="home-landing__close-inner">
          <h2>พร้อมเริ่มต้นแล้วหรือยัง</h2>
          <p>ดูรายละเอียดโครงการ หรือเข้าสู่ระบบเพื่อจัดการข้อมูลโรงเรียน</p>
          <div className="home-landing__cta">
            <Link href="/about" className="ed-btn ed-btn--primary">
              อ่านเกี่ยวกับโครงการ <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="ed-btn ed-btn--outline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
