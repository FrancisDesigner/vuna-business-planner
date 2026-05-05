import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAdvancedRoadmap } from './advancedCalculator';
import { buildAdvancedPlanPayload, hydrateAdvancedFormFromStoredInputs } from './advancedPlanner';
import type { AdvancedFormState } from '../types/advanced';

const form: AdvancedFormState = {
  businessName: 'Bakery Expansion',
  location: 'Uganda',
  industry: 'Manufacturing',
  investmentSize: 12_000_000,
  rawMaterials: 1_000_000,
  directLabor: 250_000,
  packaging: 150_000,
  otherVariable: 100_000,
  batchYield: 500,
  equipmentCost: 8_000_000,
  depreciationMethod: 'straight-line',
  usefulLife: 5,
  salvageValue: 500_000,
  monthlyRent: 400_000,
  monthlySalaries: 900_000,
  monthlyOtherFixed: 250_000,
  utilities: 120_000,
  utilitiesBehavior: 'mixed',
  transport: 180_000,
  transportBehavior: 'variable',
  marketing: 100_000,
  marketingBehavior: 'fixed',
  otherOperating: 80_000,
  otherOperatingBehavior: 'fixed',
  loanAmount: 4_000_000,
  annualInterestRate: 20,
  loanTermMonths: 24,
  taxRate: 25,
  unitsPerWeek: 300,
  sellingPrice: 6_000,
  growthTargetPercent: 30,
};

test('advanced plan payload stores inputs and calculated results under the shared planner contract', () => {
  const results = calculateAdvancedRoadmap(form);
  const payload = buildAdvancedPlanPayload(form, results, 'UGX');

  assert.equal(payload.mode, 'advanced');
  assert.equal(payload.name, 'Bakery Expansion');
  assert.equal(payload.business_type, 'Manufacturing');
  assert.equal(payload.inputs.saved_from, 'advanced_mode');
  assert.equal(payload.results.saved_from, 'advanced_mode');
  assert.equal(payload.results.monthlyNetProfit, results.monthlyNetProfit);
});

test('advanced stored inputs hydrate back into a form state without persistence metadata', () => {
  const hydrated = hydrateAdvancedFormFromStoredInputs({
    businessName: 'Loaded Bakery',
    industry: 'Retail',
    saved_from: 'advanced_mode',
  }, form);

  assert.equal(hydrated.businessName, 'Loaded Bakery');
  assert.equal(hydrated.industry, 'Retail');
  assert.equal('saved_from' in hydrated, false);
  assert.equal(hydrated.location, 'Uganda');
});
