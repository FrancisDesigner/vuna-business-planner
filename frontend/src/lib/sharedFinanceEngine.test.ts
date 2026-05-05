import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateAnnuityPayment,
  calculateGrowthRetentionGuidance,
  calculateProfitToCashBridge,
  calculateSensitivityMatrix,
  calculateGrowingPerpetuityTerminalValue,
  calculateInternalRateOfReturn,
  calculateInterestCoverageRatio,
  calculateLoanAmortization,
  calculateMonthlyProfitSnapshot,
  calculateNetPresentValue,
  compareReturnToBenchmark,
  calculateReturnOnInvestedCapital,
  calculateUnitEconomics,
  calculateWeightedAverageCostOfCapital,
} from './sharedFinanceEngine';

const FLOAT_TOLERANCE = 0.01;

function assertClose(actual: number, expected: number, label: string) {
  assert.ok(
    Math.abs(actual - expected) < FLOAT_TOLERANCE,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

test('unit economics returns contribution and weekly amounts', () => {
  const result = calculateUnitEconomics({
    totalVariableInputCost: 1_650_000,
    batchYield: 500,
    sellingPrice: 6_500,
    weeklyUnits: 120,
  });

  assertClose(result.unitBaseCost, 3_300, 'unitBaseCost');
  assertClose(result.contributionMarginPerUnit, 3_200, 'contributionMarginPerUnit');
  assertClose(result.weeklyRevenue, 780_000, 'weeklyRevenue');
  assertClose(result.weeklyVariableCosts, 396_000, 'weeklyVariableCosts');
});

test('annuity payment and amortization schedule stay consistent', () => {
  const monthlyPayment = calculateAnnuityPayment(1_200_000, 24, 12);
  const amortization = calculateLoanAmortization(1_200_000, 24, 12);

  assertClose(monthlyPayment, amortization.monthlyPayment, 'monthly payment');
  assert.equal(amortization.schedule.length, 12);
  assert.ok(amortization.firstMonthInterest > 0);
  assert.ok(amortization.schedule[11].balance < 1);
});

test('monthly profit snapshot calculates tax only on positive profit', () => {
  const profit = calculateMonthlyProfitSnapshot({
    monthlyRevenue: 3_377_400,
    monthlyVariableCosts: 1_713_690,
    monthlyFixedCosts: 800_000,
    monthlyDepreciation: 36_666.67,
    monthlyInterestCost: 0,
    taxRatePercent: 25,
  });

  assertClose(profit.profitBeforeTax, 827_043.33, 'profitBeforeTax');
  assertClose(profit.taxAmount, 206_760.83, 'taxAmount');
  assertClose(profit.netProfit, 620_282.5, 'netProfit');
});

test('return metrics support advanced and expert analysis', () => {
  const interestCoverage = calculateInterestCoverageRatio(9_924_520, 480_000);
  const roic = calculateReturnOnInvestedCapital(7_443_390, 5_000_000);
  const benchmarkComparison = compareReturnToBenchmark(roic, 0.14);
  const wacc = calculateWeightedAverageCostOfCapital({
    debtAmount: 2_000_000,
    equityAmount: 3_000_000,
    costOfDebtPercent: 20,
    costOfEquityPercent: 16,
  });

  assertClose(interestCoverage ?? 0, 20.6760833333, 'interestCoverage');
  assertClose(roic ?? 0, 1.488678, 'roic');
  assertClose(benchmarkComparison.spread ?? 0, 1.348678, 'benchmark spread');
  assert.equal(benchmarkComparison.status, 'strong');
  assertClose((wacc ?? 0) * 100, 17.6, 'wacc percent');
});

test('profit-to-cash bridge shows how debt principal changes cash reality', () => {
  const bridge = calculateProfitToCashBridge({
    netProfit: 620_282.5,
    depreciation: 36_666.67,
    principalRepayment: 140_000,
  });

  assertClose(bridge.cashFromOperations, 656_949.17, 'cashFromOperations');
  assertClose(bridge.cashPosition, 516_949.17, 'cashPosition');
  assertClose(bridge.differenceFromProfit, -103_333.33, 'differenceFromProfit');
  assert.match(bridge.message, /principal repayments reduce/i);
});

test('sensitivity matrix counts profitable scenarios and identifies loss cases', () => {
  const matrix = calculateSensitivityMatrix({
    monthlyRevenue: 3_000_000,
    monthlyVariableCosts: 1_500_000,
    monthlyFixedCosts: 900_000,
    monthlyDepreciation: 50_000,
    monthlyInterestCost: 25_000,
    taxRatePercent: 25,
    revenueMultipliers: [0.8, 1, 1.2],
    costMultipliers: [1, 1.15],
  });

  assert.equal(matrix.totalScenarios, 6);
  assert.equal(matrix.profitableScenarios, 5);
  assert.ok(matrix.lossCases.some((entry) => /sales drop/i.test(entry)));
  assert.match(matrix.summary, /5 of 6/i);
});

test('growth retention guidance shows shortfall when growth needs outrun cash', () => {
  const guidance = calculateGrowthRetentionGuidance({
    targetGrowthPercent: 30,
    monthlyVariableCosts: 1_500_000,
    baseRetention: 120_000,
    monthlyNetProfit: 400_000,
    monthlyCashPosition: 200_000,
  });

  assertClose(guidance.estimatedGrowthReinvestment, 450_000, 'estimatedGrowthReinvestment');
  assertClose(guidance.recommendedRetention, 450_000, 'recommendedRetention');
  assertClose(guidance.fundingGap, 250_000, 'fundingGap');
  assert.equal(guidance.status, 'shortfall');
  assert.match(guidance.message, /30% growth/i);
});

test('npv, irr, and terminal value utilities support expert-mode valuation', () => {
  const terminalValue = calculateGrowingPerpetuityTerminalValue({
    finalYearCashFlow: 4_000_000,
    discountRatePercent: 16,
    longTermGrowthRatePercent: 5,
  });
  const npv = calculateNetPresentValue({
    initialInvestment: 10_000_000,
    annualCashFlows: [2_500_000, 3_000_000, 3_200_000, 3_500_000, 4_000_000],
    discountRatePercent: 16,
    terminalValue,
  });
  const irr = calculateInternalRateOfReturn({
    initialInvestment: 10_000_000,
    annualCashFlows: [2_500_000, 3_000_000, 3_200_000, 3_500_000, 4_000_000],
    terminalValue,
  });

  assertClose(terminalValue, 38_181_818.18, 'terminalValue');
  assertClose(npv, 18_451_097.17, 'npv');
  assert.ok((irr ?? 0) > 0.50);
});

test('terminal value rejects invalid growth assumptions', () => {
  assert.throws(
    () => calculateGrowingPerpetuityTerminalValue({
      finalYearCashFlow: 1_000_000,
      discountRatePercent: 8,
      longTermGrowthRatePercent: 8,
    }),
    /Discount rate must be greater than long-term growth rate/,
  );
});
