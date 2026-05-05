import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAdvancedRoadmap } from './advancedCalculator';
import { calculateSharedSimpleSummary } from './simpleSummary';
import type { AdvancedFormState } from '../types/advanced';

const FLOAT_TOLERANCE = 0.01;

function assertClose(actual: number, expected: number, label: string) {
  assert.ok(
    Math.abs(actual - expected) < FLOAT_TOLERANCE,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function createAdvancedState(): AdvancedFormState {
  return {
    businessName: 'Soap Works',
    location: 'Kampala',
    industry: 'Manufacturing',
    investmentSize: 5_000_000,
    rawMaterials: 1_200_000,
    directLabor: 300_000,
    packaging: 100_000,
    otherVariable: 50_000,
    batchYield: 500,
    equipmentCost: 2_400_000,
    depreciationMethod: 'straight-line',
    usefulLife: 5,
    salvageValue: 200_000,
    monthlyRent: 350_000,
    monthlySalaries: 250_000,
    monthlyOtherFixed: 50_000,
    utilities: 70_000,
    utilitiesBehavior: 'fixed',
    transport: 40_000,
    transportBehavior: 'fixed',
    marketing: 30_000,
    marketingBehavior: 'fixed',
    otherOperating: 10_000,
    otherOperatingBehavior: 'fixed',
    loanAmount: 0,
    annualInterestRate: 0,
    loanTermMonths: 0,
    taxRate: 25,
    unitsPerWeek: 120,
    sellingPrice: 6_500,
    growthTargetPercent: 0,
  };
}

test('Advanced Mode quick summary uses the shared simple-summary engine', () => {
  const state = createAdvancedState();
  const result = calculateAdvancedRoadmap(state);

  const unitBaseCost = (state.rawMaterials + state.directLabor + state.packaging + state.otherVariable) / state.batchYield;
  const monthlyFixedOps = state.monthlyRent + state.monthlySalaries + state.monthlyOtherFixed + state.utilities + state.transport + state.marketing + state.otherOperating;
  const totalStartupInvestment = state.equipmentCost + (monthlyFixedOps * 3);

  const sharedSummary = calculateSharedSimpleSummary({
    lineItems: [
      {
        id: 'advanced-primary',
        name: state.businessName,
        sellingPrice: state.sellingPrice,
        variableCostPerUnit: unitBaseCost,
        unitsPerWeek: state.unitsPerWeek,
      },
    ],
    totalMonthlyFixedCosts: monthlyFixedOps,
    startupCostsEntered: totalStartupInvestment,
    fallbackSelectedPrice: state.sellingPrice,
    fallbackVariableCostPerUnit: unitBaseCost,
    fallbackContributionMargin: state.sellingPrice - unitBaseCost,
  });

  assertClose(result.simpleSummary.contributionMargin, sharedSummary.contributionMargin, 'simpleSummary.contributionMargin');
  assertClose(result.simpleSummary.operatingBreakEvenUnits, sharedSummary.operatingBreakEvenUnits, 'simpleSummary.operatingBreakEvenUnits');
  assertClose(result.simpleSummary.investmentPaybackMonths, sharedSummary.investmentPaybackMonths, 'simpleSummary.investmentPaybackMonths');
  assertClose(result.simpleSummary.monthlyProfit, sharedSummary.monthlyProfit, 'simpleSummary.monthlyProfit');
});

test('Advanced Mode exposes shared planner outputs for the new shared model', () => {
  const state = createAdvancedState();
  state.loanAmount = 1_200_000;
  state.annualInterestRate = 24;
  state.loanTermMonths = 12;

  const result = calculateAdvancedRoadmap(state);

  assert.ok(result.monthlyCashPosition > 0);
  assert.ok(result.annualInterestCost > 0);
  assert.ok((result.interestCoverageRatio ?? 0) > 1);
  assert.ok((result.roic ?? 0) > 0);
  assert.equal(result.benchmarkRate, 0.14);
  assert.ok((result.benchmarkSpread ?? 0) > 0);
  assert.equal(result.benchmarkStatus, 'strong');
  assert.equal(result.sharedPlannerOutputs.metrics.revenue, result.monthlyRevenue);
  assert.equal(result.sharedPlannerOutputs.metrics.cash_position, result.monthlyCashPosition);
  assert.equal(result.sharedPlannerOutputs.metrics.owner_distribution, result.ownerDistributionCapacity);
  assert.equal(result.sharedPlannerOutputs.explanations.roic, 'Shows how hard the business is making your capital work.');
});

test('Advanced Mode classifies operating costs into fixed, variable, and mixed buckets', () => {
  const state = createAdvancedState();
  state.utilities = 86_600;
  state.utilitiesBehavior = 'variable';
  state.transport = 43_300;
  state.transportBehavior = 'mixed';
  state.marketing = 30_000;
  state.marketingBehavior = 'fixed';
  state.otherOperating = 20_000;
  state.otherOperatingBehavior = 'mixed';

  const result = calculateAdvancedRoadmap(state);

  assertClose(result.monthlyFixedBaseCosts, 680_000, 'monthlyFixedBaseCosts');
  assertClose(result.monthlyOperatingVariableCostsAtBaseSales, 118_250, 'monthlyOperatingVariableCostsAtBaseSales');
  assertClose(result.monthlyOperatingMixedCosts, 63_300, 'monthlyOperatingMixedCosts');
  assertClose(result.costStructure.fixedMonthlyCost, 680_000, 'costStructure.fixedMonthlyCost');
  assertClose(result.costStructure.variableMonthlyCostAtBaseSales, 86_600, 'costStructure.variableMonthlyCostAtBaseSales');
  assertClose(result.costStructure.mixedMonthlyCost, 63_300, 'costStructure.mixedMonthlyCost');
  assertClose(result.operatingVariableCostPerUnit, 227.57890685, 'operatingVariableCostPerUnit');
  assertClose(result.effectiveContributionMargin, 2_972.42109315, 'effectiveContributionMargin');
  assert.match(result.costStructure.riskMessage, /fixed portion|fixed/i);
});

test('Advanced Mode flags risky debt when operating profit cannot safely cover interest', () => {
  const state = createAdvancedState();
  state.loanAmount = 4_000_000;
  state.annualInterestRate = 36;
  state.loanTermMonths = 12;
  state.unitsPerWeek = 50;

  const result = calculateAdvancedRoadmap(state);

  assert.ok((result.interestCoverageRatio ?? 0) < 1.5, 'interestCoverageRatio should fall into risky range');
  assert.equal(result.interestCoverageStatus, 'risky');
  assert.match(result.interestCoverageMessage, /Debt service looks risky/i);
  assert.ok(result.warnings.some((warning) => /Debt service looks risky/i.test(warning)));
});

test('Advanced Mode explains when returns are below benchmark and cash lags profit', () => {
  const state = createAdvancedState();
  state.investmentSize = 40_000_000;
  state.loanAmount = 12_000_000;
  state.annualInterestRate = 48;
  state.loanTermMonths = 12;
  state.unitsPerWeek = 100;

  const result = calculateAdvancedRoadmap(state);

  assert.equal(result.benchmarkStatus, 'weak');
  assert.ok((result.benchmarkSpread ?? 0) < 0);
  assert.match(result.benchmarkMessage, /below the benchmark/i);
  assert.ok(result.monthlyNetProfit > 0);
  assert.ok(result.monthlyCashPosition < 0);
  assertClose(result.cashBridge.cashPosition, result.monthlyCashPosition, 'cashBridge.cashPosition');
  assert.match(result.cashBridge.message, /cash squeeze/i);
  assert.ok(result.warnings.some((warning) => /below the benchmark/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /cash squeeze/i.test(warning)));
});

test('Advanced Mode builds sensitivity and reinvestment guidance for growth decisions', () => {
  const state = createAdvancedState();
  state.growthTargetPercent = 30;
  state.loanAmount = 2_500_000;
  state.annualInterestRate = 30;
  state.loanTermMonths = 12;

  const result = calculateAdvancedRoadmap(state);

  assert.equal(result.sensitivityMatrix.totalScenarios, 6);
  assert.ok(result.sensitivityMatrix.profitableScenarios > 0);
  assert.match(result.sensitivityMatrix.summary, /profitable/i);
  assert.equal(result.growthRetention.targetGrowthPercent, 30);
  assert.ok(result.growthRetention.estimatedGrowthReinvestment > 0);
  assert.ok(result.growthRetention.recommendedRetention >= result.reinvestmentNeed);
  assert.match(result.growthRetention.message, /30% growth/i);
});
