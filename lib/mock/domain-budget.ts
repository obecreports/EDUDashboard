/** Mock domain budget summary for home hub + /budget page. */

export type BudgetProject = {
  id: string;
  name: string;
  fiscal_year: string;
  cost: number;
  unit: string;
  status: 'ดำเนินการ' | 'เสร็จสิ้น' | 'วางแผน';
};

export type DomainBudgetSummary = {
  projectCount: number;
  totalCost: number;
  projects: BudgetProject[];
};

const MOCK_PROJECTS: BudgetProject[] = [
  {
    id: 'bud-1',
    name: 'สนับสนุนสื่อการเรียนรู้ STEM',
    fiscal_year: '2568',
    cost: 1_250_000,
    unit: 'สำนักงานโครงการ',
    status: 'ดำเนินการ',
  },
  {
    id: 'bud-2',
    name: 'พัฒนาห้องสมุดและแหล่งเรียนรู้',
    fiscal_year: '2568',
    cost: 890_000,
    unit: 'สำนักงานโครงการ',
    status: 'วางแผน',
  },
  {
    id: 'bud-3',
    name: 'ทุนการศึกษาต่อเนื่อง',
    fiscal_year: '2567',
    cost: 2_400_000,
    unit: 'กองทุนการศึกษา',
    status: 'เสร็จสิ้น',
  },
  {
    id: 'bud-4',
    name: 'ปรับปรุงอาคารเรียน / สุขาภิบาล',
    fiscal_year: '2567',
    cost: 3_150_000,
    unit: 'สำนักงานโครงการ',
    status: 'เสร็จสิ้น',
  },
  {
    id: 'bud-5',
    name: 'อบรมครูและอาสาสมัคร',
    fiscal_year: '2568',
    cost: 420_000,
    unit: 'ฝ่ายพัฒนาบุคลากร',
    status: 'ดำเนินการ',
  },
];

/** Stable mock budget for a domain (same numbers for all viewers). */
export function getDomainBudgetSummary(
  _domainKey?: string | null
): DomainBudgetSummary {
  void _domainKey;
  const totalCost = MOCK_PROJECTS.reduce((sum, p) => sum + p.cost, 0);
  return {
    projectCount: MOCK_PROJECTS.length,
    totalCost,
    projects: MOCK_PROJECTS,
  };
}

export function formatBudgetBaht(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount);
}
