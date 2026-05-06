import * as z from 'zod';

import type { AdvancedFormState } from '../types/advanced';

export const advancedFormSchema = z.object({
  businessName: z.string().min(1, 'Required'),
  location: z.string().min(1, 'Required'),
  industry: z.string().min(1, 'Required'),
  investmentSize: z.number().min(0),

  rawMaterials: z.number().min(0),
  directLabor: z.number().min(0),
  packaging: z.number().min(0),
  otherVariable: z.number().min(0),
  batchYield: z.number().min(1, 'Must be at least 1'),

  equipmentCost: z.number().min(0),
  depreciationMethod: z.enum(['straight-line', 'declining-balance']),
  usefulLife: z.number().min(0),
  salvageValue: z.number().min(0),
  monthlyRent: z.number().min(0),
  monthlySalaries: z.number().min(0),
  monthlyOtherFixed: z.number().min(0),

  utilities: z.number().min(0),
  utilitiesBehavior: z.enum(['fixed', 'variable', 'mixed']),
  transport: z.number().min(0),
  transportBehavior: z.enum(['fixed', 'variable', 'mixed']),
  marketing: z.number().min(0),
  marketingBehavior: z.enum(['fixed', 'variable', 'mixed']),
  otherOperating: z.number().min(0),
  otherOperatingBehavior: z.enum(['fixed', 'variable', 'mixed']),

  loanAmount: z.number().min(0),
  annualInterestRate: z.number().min(0),
  loanTermMonths: z.number().min(0),

  taxRate: z.number().min(0).max(100),

  unitsPerWeek: z.number().min(0),
  sellingPrice: z.number().min(0),
  growthTargetPercent: z.number().min(0).max(100),
});

export function parseAdvancedFormForAutosave(values: unknown): AdvancedFormState | null {
  const parsed = advancedFormSchema.safeParse(values);
  return parsed.success ? parsed.data : null;
}

export interface AdvancedFormStorage {
  setItem(key: string, value: string): void;
}

export function saveAdvancedFormIfValid(
  storage: AdvancedFormStorage,
  key: string,
  values: unknown,
): AdvancedFormState | null {
  const parsed = parseAdvancedFormForAutosave(values);

  if (!parsed) {
    return null;
  }

  storage.setItem(key, JSON.stringify(parsed));
  return parsed;
}
