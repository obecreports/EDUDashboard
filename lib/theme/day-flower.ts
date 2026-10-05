/** Traditional Thai weekday colors × signature flowers for Staff Dashboard hero */

export type DayFlowerTheme = {
  dayIndex: number;
  dayName: string;
  flowerName: string;
  flowerBadge: string;
  background: string;
  border: string;
  accent: string;
  patternClass: string;
  /** Public URL under /public/images/flowers/ */
  imageSrc: string;
};

const THEMES: DayFlowerTheme[] = [
  {
    dayIndex: 0,
    dayName: 'อาทิตย์',
    flowerName: 'ดอกชบา / เข็มแดง',
    flowerBadge: 'ดอกชบาประจำวันอาทิตย์',
    background: '#FECDD3',
    border: '#FDA4AF',
    accent: '#BE123C',
    patternClass: 'day-flower--sun',
    imageSrc: '/images/flowers/flower_sunday.png',
  },
  {
    dayIndex: 1,
    dayName: 'จันทร์',
    flowerName: 'ดอกคูน / ราชพฤกษ์',
    flowerBadge: 'ดอกคูนประจำวันจันทร์',
    background: '#FEF08A',
    border: '#FDE047',
    accent: '#A16207',
    patternClass: 'day-flower--mon',
    imageSrc: '/images/flowers/flower_monday.png',
  },
  {
    dayIndex: 2,
    dayName: 'อังคาร',
    flowerName: 'ดอกชมพูพันธุ์ทิพย์',
    flowerBadge: 'ดอกชมพูพันธุ์ทิพย์ประจำวันอังคาร',
    background: '#FBCFE8',
    border: '#F9A8D4',
    accent: '#BE185D',
    patternClass: 'day-flower--tue',
    imageSrc: '/images/flowers/flower_tuesday.png',
  },
  {
    dayIndex: 3,
    dayName: 'พุธ',
    flowerName: 'ดอกแก้ว / โมก',
    flowerBadge: 'ดอกโมกประจำวันพุธ',
    background: '#BBF7D0',
    border: '#86EFAC',
    accent: '#15803D',
    patternClass: 'day-flower--wed',
    imageSrc: '/images/flowers/flower_wednesday.png',
  },
  {
    dayIndex: 4,
    dayName: 'พฤหัสบดี',
    flowerName: 'ดอกทองกวาว',
    flowerBadge: 'ดอกทองกวาวประจำวันพฤหัสบดี',
    background: '#FED7AA',
    border: '#FDBA74',
    accent: '#C2410C',
    patternClass: 'day-flower--thu',
    imageSrc: '/images/flowers/flower_thursday.png',
  },
  {
    dayIndex: 5,
    dayName: 'ศุกร์',
    flowerName: 'ดอกอัญชัน',
    flowerBadge: 'ดอกอัญชันประจำวันศุกร์',
    background: '#BAE6FD',
    border: '#7DD3FC',
    accent: '#0369A1',
    patternClass: 'day-flower--fri',
    imageSrc: '/images/flowers/flower_friday.png',
  },
  {
    dayIndex: 6,
    dayName: 'เสาร์',
    flowerName: 'ดอกกล้วยไม้ม่วง / อินทนิล',
    flowerBadge: 'ดอกอินทนิลประจำวันเสาร์',
    background: '#E9D5FF',
    border: '#D8B4FE',
    accent: '#7E22CE',
    patternClass: 'day-flower--sat',
    imageSrc: '/images/flowers/flower_saturday.png',
  },
];

export function getDayFlowerTheme(date: Date = new Date()): DayFlowerTheme {
  return THEMES[date.getDay()] ?? THEMES[1];
}

export function greetingForDay(theme: DayFlowerTheme = getDayFlowerTheme()): string {
  return `สวัสดีวัน${theme.dayName}`;
}
