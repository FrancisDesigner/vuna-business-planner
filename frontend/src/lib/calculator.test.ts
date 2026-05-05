import test from 'node:test';
import assert from 'node:assert/strict';

import type { WizardState } from '../types';
import { calculateRoadmap, simulatePriceImpact } from './calculator';

const FLOAT_TOLERANCE = 0.01;

function assertClose(actual: number, expected: number, label: string) {
  assert.ok(
    Math.abs(actual - expected) < FLOAT_TOLERANCE,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function createBaseState(): WizardState {
  return {
    currentStep: 1,
    completedSteps: [],
    isExpertMode: false,
    currencyCode: 'UGX',
    marketCountryName: 'Uganda',
    step1_entry: {
      businessStatus: 'new',
      activityDescription: 'Test business',
      category: 'manufacturing',
      location: 'Kampala',
      salesPerWeek: 0,
      landUnit: 'acre',
      landStatus: 'owned',
      landArea: 1,
      landRentPerUnit: 0,
      seasonCycle: 1,
      yieldUnit: 'kg',
      businessPurpose: 'cover_family_needs',
      customerPaymentTiming: 'immediate',
      growthAmbitionPercent: 0,
    },
    step2_buckets: {
      seedCosts: [],
      foundationCosts: [],
      fuelCosts: [],
      protectionCosts: [],
      stockRefillFrequency: 'weekly',
      batchYield: 1,
      items: [
        {
          id: 'item-1',
          name: '',
          buyingPrice: 0,
          sellingPrice: 0,
          unitsPerWeek: 0,
        },
      ],
    },
    step3_strategy: {
      selectedPrice: 0,
      expectedYield: 0,
      expectedPrice: 0,
      byProductRevenue: 0,
    },
    step4_vision: {
      pdfGenerated: false,
    },
  };
}

test('G-001 computes constitution-compliant Simple Mode break-even and payback outputs', () => {
  const state = createBaseState();
  state.step1_entry.salesPerWeek = 50;
  state.step2_buckets.batchYield = 1;
  state.step2_buckets.seedCosts = [
    { id: 'seed-1', name: 'Raw materials', amount: 4_000, costCategory: 'one-time' },
  ];
  state.step2_buckets.foundationCosts = [
    { id: 'found-1', name: 'Workspace rent', amount: 600_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.fuelCosts = [
    { id: 'fuel-1', name: 'Utilities', amount: 200_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.protectionCosts = [
    { id: 'prot-1', name: 'Insurance', amount: 100_000, costCategory: 'monthly' },
  ];
  state.step3_strategy.selectedPrice = 10_000;

  const result = calculateRoadmap(state, 'manufacturing');

  assertClose(result.contributionMargin, 6_000, 'contributionMargin');
  assertClose(result.totalMonthlyFixedCosts, 900_000, 'totalMonthlyFixedCosts');
  assertClose(result.operatingBreakEvenUnits, 150, 'operatingBreakEvenUnits');
  assertClose(result.operatingBreakEvenWeeks, 3, 'operatingBreakEvenWeeks');
  assertClose(result.monthlySales, 216.66666666666666, 'monthlySales');
  assertClose(result.monthlyRevenue, 2_166_666.6666666665, 'monthlyRevenue');
  assertClose(result.monthlyVariableCosts, 866_666.6666666666, 'monthlyVariableCosts');
  assertClose(result.monthlyProfit, 400_000, 'monthlyProfit');
  assertClose(result.firstStockCost, 866_666.6666666666, 'firstStockCost');
  assertClose(result.totalInitialInvestment, 866_666.6666666666, 'totalInitialInvestment');
  assertClose(result.investmentPaybackMonths, 2.1666666666666665, 'investmentPaybackMonths');
  assertClose(result.projectedHarvest12Months, 3_933_333.3333333335, 'projectedHarvest12Months');
  assertClose(result.projectedHarvestYear2, 4_800_000, 'projectedHarvestYear2');
  assertClose(result.safetyBufferAmount, 80_000, 'safetyBufferAmount');
  assertClose(result.safeTakeHomeAmount, 320_000, 'safeTakeHomeAmount');
  assertClose(result.safeTakeHomeWeeklyAmount, 73_846.15384615384, 'safeTakeHomeWeeklyAmount');
  assertClose(result.safeTakeHomeDailyAmount, 10_520.547945205479, 'safeTakeHomeDailyAmount');
  assertClose(result.safetyBufferWeeklyAmount, 18_461.53846153846, 'safetyBufferWeeklyAmount');
  assertClose(result.safetyBufferDailyAmount, 2_630.1369863013697, 'safetyBufferDailyAmount');
  assertClose(result.requiredUnitsPerWeek, 34.61538461538461, 'requiredUnitsPerWeek');
  assertClose(result.unitsPerWeekGap, 0, 'unitsPerWeekGap');
  assertClose(result.breakEvenPriceNeeded, 8_153.846153846154, 'breakEvenPriceNeeded');
});

test('G-002 uses WACM for multi-product operating break-even and allocation', () => {
  const state = createBaseState();
  state.step1_entry.category = 'retail';
  state.step2_buckets.foundationCosts = [
    { id: 'found-1', name: 'Shop rent', amount: 2_000_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.items = [
    { id: 'books', name: 'Books', buyingPrice: 15_000, sellingPrice: 25_000, unitsPerWeek: 20 },
    { id: 'pens', name: 'Pens', buyingPrice: 500, sellingPrice: 1_500, unitsPerWeek: 50 },
    { id: 'ink', name: 'Ink', buyingPrice: 3_000, sellingPrice: 8_000, unitsPerWeek: 10 },
  ];

  const result = calculateRoadmap(state, 'retail');

  assertClose(result.wacm, 3_750, 'wacm');
  assertClose(result.weightedAvgSellingPrice, 8_187.5, 'weightedAvgSellingPrice');
  assertClose(result.operatingBreakEvenUnits, 533.3333333333334, 'operatingBreakEvenUnits');
  assertClose(result.operatingBreakEvenRevenue, 4_366_666.666666667, 'operatingBreakEvenRevenue');
  assert.equal(result.productBreakdown.length, 3);
  assert.equal(result.pricingOptions.length, 3);

  const books = result.productBreakdown.find((product) => product.id === 'books');
  assert.ok(books, 'books breakdown present');
  assertClose(books.allocatedBreakEvenUnits, 133.33333333333334, 'books allocatedBreakEvenUnits');

  const mediumPricing = result.pricingOptions.find((option) => option.key === 'medium');
  assert.ok(mediumPricing, 'medium pricing option present');
  const mediumBooks = mediumPricing.items.find((item) => item.id === 'books');
  assert.ok(mediumBooks, 'books medium pricing row present');
  assertClose(mediumBooks.suggestedSellPrice, 27_500, 'books medium sell price');
});

test('G-003 shows zero monthly sales target when no monthly costs were entered', () => {
  const state = createBaseState();
  state.step1_entry.category = 'retail';
  state.step2_buckets.items = [
    { id: 'maize', name: 'Maize flour', buyingPrice: 1_800, sellingPrice: 2_900, unitsPerWeek: 12 },
    { id: 'oil', name: 'Cooking oil', buyingPrice: 5_000, sellingPrice: 7_700, unitsPerWeek: 15 },
    { id: 'soda', name: 'Sodas', buyingPrice: 10_500, sellingPrice: 13_200, unitsPerWeek: 5 },
  ];

  const result = calculateRoadmap(state, 'retail');

  assertClose(result.totalMonthlyFixedCosts, 0, 'totalMonthlyFixedCosts');
  assertClose(result.operatingBreakEvenUnits, 0, 'operatingBreakEvenUnits');
  assert.match(result.breakEvenWarning || '', /monthly costs/i);
});

test('G-004 manufacturing startup money excludes recurring production costs and shows weekly gap', () => {
  const state = createBaseState();
  state.step1_entry.salesPerWeek = 20;
  state.step2_buckets.seedCosts = [
    { id: 'raw', name: 'Raw materials', amount: 1_495_000, costCategory: 'one-time' },
    { id: 'pack', name: 'Packaging', amount: 1_050_000, costCategory: 'one-time' },
    { id: 'carton', name: 'Carton boxes', amount: 1_200_000, costCategory: 'one-time' },
  ];
  state.step2_buckets.foundationCosts = [
    { id: 'operator', name: 'Machine operators', amount: 250_000, costCategory: 'monthly' },
    { id: 'rent', name: 'Workspace rent', amount: 250_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.fuelCosts = [
    { id: 'transport', name: 'Transport', amount: 150_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.protectionCosts = [
    { id: 'feeding', name: 'Feeding', amount: 200_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.batchYield = 100;
  state.step3_strategy.selectedPrice = 45_000;

  const result = calculateRoadmap(state, 'manufacturing');

  assertClose(result.startupCostsEntered, 0, 'startupCostsEntered');
  assert.ok(result.monthlyProfit < 0, 'monthlyProfit should be negative');
  assertClose(result.requiredUnitsPerWeek, 25.98064187468161, 'requiredUnitsPerWeek');
  assertClose(result.unitsPerWeekGap, 5.980641874681608, 'unitsPerWeekGap');
  assertClose(result.breakEvenPriceNeeded, 47_257.692307692305, 'breakEvenPriceNeeded');
  assertClose(result.lossPerDay, 6_432.876712328777, 'lossPerDay');
});

test('G-005 price impact simulator reuses shared engine and updates profit live', () => {
  const state = createBaseState();
  state.step1_entry.category = 'retail';
  state.step2_buckets.foundationCosts = [
    { id: 'rent', name: 'Shop rent', amount: 100_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.fuelCosts = [
    { id: 'transport', name: 'Transport', amount: 15_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.protectionCosts = [
    { id: 'damage', name: 'Damage', amount: 10_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.items = [
    { id: 'maize', name: 'Maize flour', buyingPrice: 1_800, sellingPrice: 2_500, unitsPerWeek: 12 },
    { id: 'oil', name: 'Cooking oil', buyingPrice: 5_000, sellingPrice: 7_000, unitsPerWeek: 15 },
    { id: 'soda', name: 'Sodas', buyingPrice: 10_500, sellingPrice: 12_000, unitsPerWeek: 5 },
  ];

  const simulation = simulatePriceImpact(state, 'retail', 10, -20);

  assert.ok(simulation.monthlyProfit > 0, 'simulation monthly profit should stay positive');
  assert.ok(simulation.safeTakeHomeDailyAmount > 0, 'simulation safe take-home per day should be positive');
  assert.ok(Number.isFinite(simulation.paybackMonths), 'simulation payback should be finite');
});

test('G-006 strict rounding verification stays within 1 UGX of the constitution case', () => {
  const state = createBaseState();
  state.step1_entry.category = 'retail';
  state.step2_buckets.foundationCosts = [
    { id: 'running', name: 'Monthly running costs', amount: 2_349_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.items = [
    { id: 'chalk', name: 'Chalk box', buyingPrice: 23_898.72, sellingPrice: 45_000, unitsPerWeek: 50 },
  ];

  const result = calculateRoadmap(state, 'retail');

  assert.equal(Math.round(result.monthlyRevenue), 9_750_000, 'monthlyRevenue rounded');
  assert.ok(Math.abs(Math.round(result.monthlyRestockCost) - 5_178_055) <= 1, 'monthlyRestockCost within 1 UGX');
  assert.ok(Math.abs(Math.round(result.monthlyProfit) - 2_222_945) <= 1, 'monthlyProfit within 1 UGX');
  assert.ok(Math.abs(Math.round(result.safeTakeHomeAmount) - 1_778_356) <= 1, 'safeTakeHomeAmount within 1 UGX');
  assert.ok(Math.abs(Math.round(result.safeTakeHomeWeeklyAmount) - 410_390) <= 1, 'safeTakeHomeWeeklyAmount within 1 UGX');
  assert.ok(Math.abs(Math.round(result.safeTakeHomeDailyAmount) - 58_467) <= 1, 'safeTakeHomeDailyAmount within 1 UGX');
  assert.equal(Math.round(result.safetyBufferWeeklyAmount), 102_597, 'safetyBufferWeeklyAmount rounded');
  assert.equal(Math.round(result.safetyBufferDailyAmount), 14_617, 'safetyBufferDailyAmount rounded');
  assert.equal(result.investmentPaybackMonths.toFixed(2), '2.33', 'investmentPaybackMonths display');
  assert.equal(Math.ceil(result.operatingBreakEvenUnits), 112, 'operatingBreakEvenUnits target');
});

test('G-007 separates paper profit from cash when customers pay later', () => {
  const state = createBaseState();
  state.step1_entry.salesPerWeek = 50;
  state.step1_entry.customerPaymentTiming = 'within_month';
  state.step2_buckets.seedCosts = [
    { id: 'seed-1', name: 'Raw materials', amount: 4_000, costCategory: 'one-time' },
  ];
  state.step2_buckets.foundationCosts = [
    { id: 'found-1', name: 'Workspace rent', amount: 600_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.fuelCosts = [
    { id: 'fuel-1', name: 'Utilities', amount: 200_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.protectionCosts = [
    { id: 'prot-1', name: 'Insurance', amount: 100_000, costCategory: 'monthly' },
  ];
  state.step3_strategy.selectedPrice = 10_000;

  const result = calculateRoadmap(state, 'manufacturing');

  assertClose(result.monthlyProfit, 400_000, 'monthlyProfit');
  assertClose(result.estimatedCashCollected, 1_083_333.3333333333, 'estimatedCashCollected');
  assertClose(result.estimatedCashPosition, -683_333.3333333333, 'estimatedCashPosition');
  assert.equal(result.cashGapRisk, 'high');
  assert.match(result.cashGapMessage || '', /profit on paper/i);
});

test('G-008 builds a bad-month scenario and growth warning for small-business planning', () => {
  const state = createBaseState();
  state.step1_entry.salesPerWeek = 50;
  state.step1_entry.growthAmbitionPercent = 25;
  state.step1_entry.businessPurpose = 'grow_the_business';
  state.step2_buckets.seedCosts = [
    { id: 'seed-1', name: 'Raw materials', amount: 4_000, costCategory: 'one-time' },
  ];
  state.step2_buckets.foundationCosts = [
    { id: 'found-1', name: 'Workspace rent', amount: 600_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.fuelCosts = [
    { id: 'fuel-1', name: 'Utilities', amount: 200_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.protectionCosts = [
    { id: 'prot-1', name: 'Insurance', amount: 100_000, costCategory: 'monthly' },
  ];
  state.step3_strategy.selectedPrice = 10_000;

  const result = calculateRoadmap(state, 'manufacturing');

  assertClose(result.badMonthMonthlyRevenue, 1_625_000, 'badMonthMonthlyRevenue');
  assertClose(result.badMonthMonthlyProfit, 75_000, 'badMonthMonthlyProfit');
  assertClose(result.growthStockNeeded, 216_666.66666666666, 'growthStockNeeded');
  assert.match(result.growthWarningMessage || '', /grow sales by 25%/i);
  assert.match(result.purposeHeadline, /grow/i);
});

test('G-009 ongoing businesses do not carry startup recovery investment', () => {
  const state = createBaseState();
  state.step1_entry.businessStatus = 'ongoing';
  state.step1_entry.category = 'retail';
  state.step2_buckets.seedCosts = [
    { id: 'license', name: 'Old opening cost', amount: 300_000, costCategory: 'one-time' },
  ];
  state.step2_buckets.foundationCosts = [
    { id: 'rent', name: 'Shop rent', amount: 100_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.items = [
    { id: 'stock', name: 'Stock', buyingPrice: 2_000, sellingPrice: 3_500, unitsPerWeek: 100 },
  ];

  const result = calculateRoadmap(state, 'retail');

  assert.equal(result.businessStatus, 'ongoing');
  assertClose(result.totalInitialInvestment, 0, 'totalInitialInvestment');
  assertClose(result.investmentPaybackMonths, 0, 'investmentPaybackMonths');
  assert.equal(result.startupMoneyWarning, null);
});

test('G-010 agriculture mode computes gross margin, cost of production, and break-even season metrics', () => {
  const state = createBaseState();
  state.step1_entry.businessStatus = 'ongoing';
  state.step1_entry.category = 'agriculture';
  state.step1_entry.activityDescription = 'Tomato farm';
  state.step1_entry.landStatus = 'rented';
  state.step1_entry.landArea = 2;
  state.step1_entry.landRentPerUnit = 100_000;
  state.step1_entry.landUnit = 'acre';
  state.step1_entry.yieldUnit = 'kg';
  state.step2_buckets.seedCosts = [
    { id: 'seed', name: 'Seeds and fertiliser', amount: 300_000, costCategory: 'one-time' },
  ];
  state.step2_buckets.fuelCosts = [
    { id: 'labour', name: 'Planting and weeding', amount: 150_000, costCategory: 'monthly' },
  ];
  state.step2_buckets.protectionCosts = [
    { id: 'transport', name: 'Transport to market', amount: 50_000, costCategory: 'monthly' },
  ];
  state.step3_strategy.expectedYield = 1_000;
  state.step3_strategy.expectedPrice = 1_200;
  state.step3_strategy.byProductRevenue = 100_000;

  const result = calculateRoadmap(state, 'agriculture');

  assert.equal(result.isAgricultureMode, true);
  assertClose(result.totalVariableCosts, 700_000, 'totalVariableCosts');
  assertClose(result.effectiveRevenue, 1_300_000, 'effectiveRevenue');
  assertClose(result.grossMargin, 600_000, 'grossMargin');
  assertClose(result.grossMarginPerLandUnit, 300_000, 'grossMarginPerLandUnit');
  assertClose(result.costOfProductionPerUnit, 700, 'costOfProductionPerUnit');
  assertClose(result.breakEvenYield, 583.3333333333334, 'breakEvenYield');
  assertClose(result.breakEvenPricePerUnit, 700, 'breakEvenPricePerUnit');
  assertClose(result.safeTakeHomeAmount, 480_000, 'safeTakeHomeAmount');
});
