/** Thai weekday greeting + flower asset helpers */

export const WEEKDAY_META = [
  {
    key: 'sunday',
    th: 'อาทิตย์',
    color: '#E11D48',
    bg: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 55%, #FDA4AF 100%)',
    flower: '/images/flowers/flower_sunday.png',
  },
  {
    key: 'monday',
    th: 'จันทร์',
    color: '#CA8A04',
    bg: 'linear-gradient(135deg, #FEF9C3 0%, #FDE68A 55%, #FCD34D 100%)',
    flower: '/images/flowers/flower_monday.png',
  },
  {
    key: 'tuesday',
    th: 'อังคาร',
    color: '#DB2777',
    bg: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 55%, #F9A8D4 100%)',
    flower: '/images/flowers/flower_tuesday.png',
  },
  {
    key: 'wednesday',
    th: 'พุธ',
    color: '#16A34A',
    bg: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 55%, #86EFAC 100%)',
    flower: '/images/flowers/flower_wednesday.png',
  },
  {
    key: 'thursday',
    th: 'พฤหัสบดี',
    color: '#EA580C',
    bg: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 55%, #FDBA74 100%)',
    flower: '/images/flowers/flower_thursday.png',
  },
  {
    key: 'friday',
    th: 'ศุกร์',
    color: '#2563EB',
    bg: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 55%, #93C5FD 100%)',
    flower: '/images/flowers/flower_friday.png',
  },
  {
    key: 'saturday',
    th: 'เสาร์',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 55%, #C4B5FD 100%)',
    flower: '/images/flowers/flower_saturday.png',
  },
] as const;

export function weekdayMeta(date = new Date()) {
  return WEEKDAY_META[date.getDay()];
}

export function isBirthdayToday(birthday?: string | null, date = new Date()): boolean {
  if (!birthday) return false;
  const m = birthday.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return false;
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  return date.getMonth() + 1 === mm && date.getDate() === dd;
}

export function flowerForUser(birthday?: string | null, date = new Date()) {
  if (isBirthdayToday(birthday, date)) {
    return {
      src: '/images/flowers/flower_birthday.png',
      isBirthday: true as const,
      weekday: weekdayMeta(date),
    };
  }
  const weekday = weekdayMeta(date);
  return { src: weekday.flower, isBirthday: false as const, weekday };
}
