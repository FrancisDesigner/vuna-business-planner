export type AdvancedCostBehavior = 'fixed' | 'variable' | 'mixed';

export interface AdvancedFormState {
  // Section 1
  businessName: string;
  location: string;
  industry: string;
  investmentSize: number;

  // Section 2
  rawMaterials: number;
  directLabor: number;
  packaging: number;
  otherVariable: number;
  batchYield: number;

  // Section 3
  equipmentCost: number;
  depreciationMethod: 'straight-line' | 'declining-balance';
  usefulLife: number;
  salvageValue: number;
  monthlyRent: number;
  monthlySalaries: number;
  monthlyOtherFixed: number;

  // Section 4
  utilities: number;
  utilitiesBehavior: AdvancedCostBehavior;
  transport: number;
  transportBehavior: AdvancedCostBehavior;
  marketing: number;
  marketingBehavior: AdvancedCostBehavior;
  otherOperating: number;
  otherOperatingBehavior: AdvancedCostBehavior;

  // Section 5
  loanAmount: number;
  annualInterestRate: number;
  loanTermMonths: number;

  // Section 6
  taxRate: number;

  // Section 7
  unitsPerWeek: number;
  sellingPrice: number;
  growthTargetPercent: number;
}
