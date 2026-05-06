import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAdvancedFormForAutosave, saveAdvancedFormIfValid } from './advancedFormSchema';
import type { AdvancedFormState } from '../types/advanced';

const validForm: AdvancedFormState = {
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

test('advanced form autosave accepts a valid form snapshot', () => {
  const stored: Record<string, string> = {};
  const parsed = saveAdvancedFormIfValid({
    setItem: (key, value) => {
      stored[key] = value;
    },
  }, 'vuna_advanced_form', validForm);

  assert.deepEqual(parsed, validForm);
  assert.equal(JSON.parse(stored.vuna_advanced_form).businessName, validForm.businessName);
});

test('advanced form autosave does not overwrite storage with invalid form state', () => {
  const stored: Record<string, string> = {
    vuna_advanced_form: JSON.stringify(validForm),
  };
  const invalidForm = {
    ...validForm,
    businessName: '',
    batchYield: 0,
  };

  const parsed = saveAdvancedFormIfValid({
    setItem: (key, value) => {
      stored[key] = value;
    },
  }, 'vuna_advanced_form', invalidForm);

  assert.equal(parsed, null);
  assert.equal(JSON.parse(stored.vuna_advanced_form).businessName, validForm.businessName);
});

test('advanced form autosave parser rejects invalid number values', () => {
  const parsed = parseAdvancedFormForAutosave({
    ...validForm,
    taxRate: 150,
  });

  assert.equal(parsed, null);
});
