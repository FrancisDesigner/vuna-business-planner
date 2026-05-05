import test from 'node:test';
import assert from 'node:assert/strict';

import { allocateBreakEven, computeWACM, type LineItem } from './wacm';

const FLOAT_TOLERANCE = 0.01;

function assertClose(actual: number, expected: number, label: string) {
  assert.ok(
    Math.abs(actual - expected) < FLOAT_TOLERANCE,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

test('returns an empty result when there are no valid WACM items', () => {
  const result = computeWACM([
    { id: 'a', name: 'Ignored zero units', sellingPrice: 10_000, variableCostPerUnit: 4_000, unitsPerWeek: 0 },
    { id: 'b', name: 'Ignored zero price', sellingPrice: 0, variableCostPerUnit: 4_000, unitsPerWeek: 10 },
  ]);

  assert.deepEqual(result, {
    totalUnitsPerWeek: 0,
    weeklyRevenue: 0,
    weeklyVariableCosts: 0,
    weeklyTotalContribution: 0,
    weightedAvgSellingPrice: 0,
    weightedAvgVariableCost: 0,
    wacm: 0,
    cmRatio: 0,
    products: [],
    hasNegativeMarginProducts: false,
    negativeMarginWarnings: [],
  });
});

test('G-001 computes single-product contribution margin and weighted averages', () => {
  const items: LineItem[] = [
    {
      id: 'single',
      name: 'Single Product',
      sellingPrice: 10_000,
      variableCostPerUnit: 4_000,
      unitsPerWeek: 50,
    },
  ];

  const result = computeWACM(items);
  const allocated = allocateBreakEven(result, 150);

  assertClose(result.totalUnitsPerWeek, 50, 'totalUnitsPerWeek');
  assertClose(result.weeklyRevenue, 500_000, 'weeklyRevenue');
  assertClose(result.weeklyVariableCosts, 200_000, 'weeklyVariableCosts');
  assertClose(result.weeklyTotalContribution, 300_000, 'weeklyTotalContribution');
  assertClose(result.weightedAvgSellingPrice, 10_000, 'weightedAvgSellingPrice');
  assertClose(result.weightedAvgVariableCost, 4_000, 'weightedAvgVariableCost');
  assertClose(result.wacm, 6_000, 'wacm');
  assertClose(result.cmRatio, 0.6, 'cmRatio');

  assert.equal(allocated.products.length, 1);
  assertClose(allocated.products[0].mixPercent, 1, 'single mixPercent');
  assertClose(allocated.products[0].allocatedBreakEvenUnits, 150, 'single allocatedBreakEvenUnits');
  assertClose(allocated.products[0].allocatedBreakEvenRevenue, 1_500_000, 'single allocatedBreakEvenRevenue');
});

test('G-002 computes multi-product WACM and break-even allocation', () => {
  const items: LineItem[] = [
    {
      id: 'books',
      name: 'Books',
      sellingPrice: 25_000,
      variableCostPerUnit: 15_000,
      unitsPerWeek: 20,
    },
    {
      id: 'pens',
      name: 'Pens',
      sellingPrice: 1_500,
      variableCostPerUnit: 500,
      unitsPerWeek: 50,
    },
    {
      id: 'ink',
      name: 'Ink',
      sellingPrice: 8_000,
      variableCostPerUnit: 3_000,
      unitsPerWeek: 10,
    },
  ];

  const result = computeWACM(items);
  const totalBreakEvenUnits = 2_000_000 / 3_750;
  const allocated = allocateBreakEven(result, totalBreakEvenUnits);

  assertClose(result.totalUnitsPerWeek, 80, 'totalUnitsPerWeek');
  assertClose(result.weeklyRevenue, 655_000, 'weeklyRevenue');
  assertClose(result.weeklyVariableCosts, 355_000, 'weeklyVariableCosts');
  assertClose(result.weeklyTotalContribution, 300_000, 'weeklyTotalContribution');
  assertClose(result.weightedAvgSellingPrice, 8_187.5, 'weightedAvgSellingPrice');
  assertClose(result.weightedAvgVariableCost, 4_437.5, 'weightedAvgVariableCost');
  assertClose(result.wacm, 3_750, 'wacm');

  const books = allocated.products.find((product) => product.id === 'books');
  const pens = allocated.products.find((product) => product.id === 'pens');
  const ink = allocated.products.find((product) => product.id === 'ink');

  assert.ok(books, 'books allocation present');
  assert.ok(pens, 'pens allocation present');
  assert.ok(ink, 'ink allocation present');

  assertClose(books.mixPercent, 0.25, 'books mixPercent');
  assertClose(pens.mixPercent, 0.625, 'pens mixPercent');
  assertClose(ink.mixPercent, 0.125, 'ink mixPercent');

  assertClose(books.allocatedBreakEvenUnits, totalBreakEvenUnits * 0.25, 'books allocatedBreakEvenUnits');
  assertClose(pens.allocatedBreakEvenUnits, totalBreakEvenUnits * 0.625, 'pens allocatedBreakEvenUnits');
  assertClose(ink.allocatedBreakEvenUnits, totalBreakEvenUnits * 0.125, 'ink allocatedBreakEvenUnits');

  assertClose(books.allocatedBreakEvenRevenue, totalBreakEvenUnits * 0.25 * 25_000, 'books allocatedBreakEvenRevenue');
  assertClose(pens.allocatedBreakEvenRevenue, totalBreakEvenUnits * 0.625 * 1_500, 'pens allocatedBreakEvenRevenue');
  assertClose(ink.allocatedBreakEvenRevenue, totalBreakEvenUnits * 0.125 * 8_000, 'ink allocatedBreakEvenRevenue');
});

test('flags negative-margin products without breaking the blended result', () => {
  const result = computeWACM([
    {
      id: 'loss-leader',
      name: 'Loss Leader',
      sellingPrice: 800,
      variableCostPerUnit: 1_000,
      unitsPerWeek: 10,
    },
    {
      id: 'profitable',
      name: 'Profitable Item',
      sellingPrice: 2_000,
      variableCostPerUnit: 500,
      unitsPerWeek: 10,
    },
  ]);

  assert.equal(result.hasNegativeMarginProducts, true);
  assert.equal(result.negativeMarginWarnings.length, 1);
  assert.match(result.negativeMarginWarnings[0], /Loss Leader/);
  assert.equal(result.products[0].isNegativeMargin, true);
  assertClose(result.wacm, 650, 'wacm with negative-margin product');
});
