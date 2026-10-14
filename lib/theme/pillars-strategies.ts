/** Landing / reference: 3 เสาหลัก ↔ 5 กลยุทธ์ mapping */

export const LANDING_PILLARS = [
  {
    id: 1,
    label: 'ให้เด็กได้เรียนในโรงเรียนที่มีคุณภาพ',
    strategyIds: [1, 5] as const,
  },
  {
    id: 2,
    label: 'ให้เด็กสำเร็จการศึกษาอย่างมีคุณภาพ',
    strategyIds: [2, 4] as const,
  },
  {
    id: 3,
    label: 'ปลูกฝังวินัย คุณธรรม-จริยธรรม',
    strategyIds: [3] as const,
  },
] as const;

export const LANDING_STRATEGIES = [
  {
    id: 1,
    label: 'การพัฒนาครูให้มีศักยภาพในการจัดกิจกรรมการเรียนการสอน',
  },
  {
    id: 2,
    label: 'การยกระดับผลสัมฤทธิ์ทางการเรียน',
  },
  {
    id: 3,
    label: 'การพัฒนาคุณลักษณะของนักเรียนให้มีวินัย คุณธรรม จริยธรรม',
  },
  {
    id: 4,
    label: 'การพัฒนาทักษะชีวิตและทักษะอาชีพ',
  },
  {
    id: 5,
    label: 'การบริหารจัดการโรงเรียนคุณภาพ',
  },
] as const;
