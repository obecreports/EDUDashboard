'use client';

import Image from 'next/image';
import { flowerForUser } from '@/lib/theme/weekday';

export function DashboardWelcome({
  fullName,
  birthday,
  namePrefix,
}: {
  fullName: string;
  birthday?: string | null;
  namePrefix?: string | null;
}) {
  const { src, isBirthday, weekday } = flowerForUser(birthday);
  const name = fullName?.trim() || 'อาสาสมัคร';
  const prefix = (namePrefix?.trim() || 'คุณ').replace(/\s+$/, '');

  return (
    <section className="dash-welcome">
      <div className="dash-welcome__bg" aria-hidden>
        <Image
          src="/images/banners/banner_dashboard.jpg"
          alt=""
          fill
          priority
          className="dash-welcome__bg-img"
          sizes="100vw"
        />
        <div
          className="dash-welcome__dim"
          style={{
            background: `linear-gradient(135deg, ${weekday.color}cc 0%, ${weekday.color}99 45%, ${weekday.color}66 100%)`,
          }}
        />
      </div>
      <div className="dash-welcome__copy">
        <p className="dash-welcome__eyebrow m-0" style={{ color: '#fff' }}>
          สวัสดีวัน{weekday.th}
        </p>
        <h1 className="dash-welcome__title m-0">
          {isBirthday ? 'สุขสันต์วันเกิด' : 'ยินดีต้อนรับ'} {prefix}
          {name}
        </h1>
        <p className="dash-welcome__sub m-0">
          {isBirthday
            ? 'ขอให้วันนี้เต็มไปด้วยรอยยิ้มและกำลังใจในการพัฒนาโรงเรียน'
            : 'มาติดตามและสนับสนุนโรงเรียนภายในสังกัดของคุณได้เลย'}
        </p>
      </div>
      {/* <div className="dash-welcome__art">
        <Image src={src} alt="" width={140} height={140} priority className="dash-welcome__flower" />
      </div> */}
    </section>
  );
}
