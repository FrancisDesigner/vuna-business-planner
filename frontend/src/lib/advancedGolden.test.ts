import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAdvancedRoadmap } from './advancedCalculator';
import { saveAdvancedFormIfValid } from './advancedFormSchema';
import { shouldGateAdvancedInvestment } from './advancedInvestmentGate';
import {
  calculateProfitToCashBridge,
  calculateSensitivityMatrix,
} from './sharedFinanceEngine';
import type { AdvancedFormState } from '../types/advanced';

const FLOAT_TOLERANCE = 0.01;

function assertClose(actual: number, expected: number, label: string) {
  assert.ok(
    Math.abs(actual - expected) < FLOAT_TOLERANCE,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function createGoldenAdvancedState(): AdvancedFormState {
  return {
    businessName: 'Golden Case',
    location: 'Kampala',
    industry: 'Retail',
    investmentSize: 0,
    rawMaterials: 600_000,
    directLabor: 200_000,
    packaging: 100_000,
    otherVariable: 100_000,
    batchYield: 1_000,
    equipmentCost: 5_000_000,
    depreciationMethod: 'straight-line',
    usefulLife: 5,
    salvageValue: 0,
    monthlyRent: 300_000,
    monthlySalaries: 300_000,
    monthlyOtherFixed: 200_000,
    utilities: 200_000,
    utilitiesBehavior: 'fixed',
    transport: 0,
    transportBehavior: 'fixed',
    marketing: 0,
    marketingBehavior: 'fixed',
    otherOperating: 0,
    otherOperatingBehavior: 'fixed',
    loanAmount: 0,
    annualInterestRate: 0,
    loanTermMonths: 0,
    taxRate: 25,
    unitsPerWeek: 250,
    sellingPrice: 2_500,
    growthTargetPercent: 0,
  };
}

test('A9-1 removes investment inflation from monthly operating costs', () => {
  const state = createGoldenAdvancedState();
  state.investmentSize = 0;
  state.equipmentCost = 5_000_000;
  state.monthlyRent = 1_000_000;
  state.monthlySalaries = 0;
  state.monthlyOtherFixed = 0;
  state.utilities = 0;

  const result = calculateAdvancedRoadmap(state);

  assertClose(result.monthlyFixedOps, 1_000_000, 'monthlyFixedOps');
  assertClose(result.totalStartupInvestment, 5_000_000, 'totalStartupInvestment');
  assertClose(result.investedCapital, 5_000_000, 'investedCapital');
});

test('A9-2 uses entered investment size as invested capital', () => {
  const state = createGoldenAdvancedState();
  state.investmentSize = 12_000_000;
  state.equipmentCost = 5_000_000;

  const result = calculateAdvancedRoadmap(state);

  assertClose(result.totalStartupInvestment, 5_000_000, 'totalStartupInvestment');
  assertClose(result.investedCapital, 12_000_000, 'investedCapital');
});

test('A9-3 equipment cost triggers the Advanced investment gate', () => {
  assert.equal(shouldGateAdvancedInvestment({
    investmentSize: 0,
    equipmentCost: 80_000_000,
    investmentGuidanceLimit: 50_000_000,
  }), true);
});

test('A9-4 sensitivity margin uses scenario revenue denominator', () => {
  const matrix = calculateSensitivityMatrix({
    monthlyRevenue: 1_000_000,
    monthlyVariableCosts: 500_000,
    monthlyFixedCosts: 360_000,
    monthlyDepreciation: 0,
    monthlyInterestCost: 0,
    taxRatePercent: 0,
    revenueMultipliers: [0.8],
    costMultipliers: [1],
  });

  assert.equal(matrix.cells.length, 1);
  assertClose(matrix.cells[0].monthlyNetProfit, 40_000, 'scenario monthlyNetProfit');
  assert.equal(matrix.cells[0].status, 'profit');
});

test('A9-5 negative profit produces a critical warning', () => {
  const state = createGoldenAdvancedState();
  state.unitsPerWeek = 10;
  state.sellingPrice = 1_500;

  const result = calculateAdvancedRoadmap(state);

  assert.ok(result.monthlyNetProfit < 0);
  assert.ok(result.warnings.some((warning) => (
    warning.severity === 'critical'
    && warning.code === 'monthly_loss'
    && /operating at a loss/i.test(warning.message)
  )));
});

test('A9-6 selling below variable cost produces a critical warning', () => {
  const state = createGoldenAdvancedState();
  state.rawMaterials = 1_200;
  state.directLabor = 0;
  state.packaging = 0;
  state.otherVariable = 0;
  state.batchYield = 1;
  state.sellingPrice = 1_000;

  const result = calculateAdvancedRoadmap(state);

  assert.equal(result.unitBaseCost, 1_200);
  assert.ok(result.warnings.some((warning) => (
    warning.severity === 'critical'
    && warning.code === 'selling_below_variable_cost'
    && /selling below your variable cost/i.test(warning.message)
  )));
});

test('A9-7 no-loan case is not treated as scary debt', () => {
  const state = createGoldenAdvancedState();
  state.loanAmount = 0;
  state.annualInterestRate = 0;
  state.loanTermMonths = 0;

  const result = calculateAdvancedRoadmap(state);

  assertClose(result.monthlyLoanPayment, 0, 'monthlyLoanPayment');
  assertClose(result.annualInterestCost, 0, 'annualInterestCost');
  assert.equal(result.interestCoverageRatio, null);
  assert.equal(result.interestCoverageStatus, 'not_applicable');
  assert.ok(result.warnings.some((warning) => warning.code === 'no_loan_entered'));
  assert.equal(result.warnings.some((warning) => (
    warning.code === 'risky_interest_coverage'
    || warning.code === 'watch_interest_coverage'
  )), false);
});

test('A9-8 loan cash bridge separates accounting profit from cash position', () => {
  const bridge = calculateProfitToCashBridge({
    netProfit: 1_000_000,
    depreciation: 200_000,
    principalRepayment: 300_000,
  });

  assertClose(bridge.cashFromOperations, 1_200_000, 'cashFromOperations');
  assertClose(bridge.cashPosition, 900_000, 'cashPosition');
});

test('A9-9 invalid Advanced form does not overwrite the last valid saved state', () => {
  const validForm = createGoldenAdvancedState();
  validForm.businessName = 'Valid Saved Case';
  validForm.investmentSize = 12_000_000;

  const stored: Record<string, string> = {};
  const saved = saveAdvancedFormIfValid({
    setItem: (key, value) => {
      stored[key] = value;
    },
  }, 'vuna_advanced_form', validForm);

  assert.deepEqual(saved, validForm);

  const invalidForm = {
    ...validForm,
    businessName: '',
    batchYield: 0,
  };
  const rejected = saveAdvancedFormIfValid({
    setItem: (key, value) => {
      stored[key] = value;
    },
  }, 'vuna_advanced_form', invalidForm);

  assert.equal(rejected, null);
  assert.equal(JSON.parse(stored.vuna_advanced_form).businessName, 'Valid Saved Case');
});
