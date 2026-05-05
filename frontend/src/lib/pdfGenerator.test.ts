import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateRoadmap } from './calculator';
import { generatePDFBlob } from './pdfGenerator';
import type { WizardState } from '../types';

const retailState: WizardState = {
  currentStep: 4,
  completedSteps: [1, 2, 3],
  isExpertMode: false,
  currencyCode: 'UGX',
  marketCountryName: 'Uganda',
  step1_entry: {
    businessStatus: 'new',
    activityDescription: 'Retail Shop',
    category: 'retail',
    location: 'Uganda',
    salesPerWeek: 0,
    landUnit: 'acre',
    landStatus: 'owned',
    landArea: 1,
    landRentPerUnit: 0,
    seasonCycle: 1,
    yieldUnit: 'kg',
    businessPurpose: 'grow_the_business',
    customerPaymentTiming: 'mixed',
    growthAmbitionPercent: 25,
  },
  step2_buckets: {
    seedCosts: [
      { id: 'license', name: 'Business licence', amount: 80000, costCategory: 'one-time' },
    ],
    foundationCosts: [
      { id: 'rent', name: 'Shop rent', amount: 100000, costCategory: 'monthly' },
      { id: 'bags', name: 'Bags and receipts', amount: 4000, costCategory: 'monthly' },
    ],
    fuelCosts: [
      { id: 'utilities', name: 'Utilities', amount: 10000, costCategory: 'monthly' },
      { id: 'transport', name: 'Transport to supplier', amount: 4000, costCategory: 'monthly' },
    ],
    protectionCosts: [],
    stockRefillFrequency: 'weekly',
    batchYield: 1,
    items: [
      { id: 'colgate', name: 'Colgate', buyingPrice: 3100, sellingPrice: 5000, unitsPerWeek: 10 },
      { id: 'pads', name: 'Pads', buyingPrice: 4000, sellingPrice: 5000, unitsPerWeek: 5 },
      { id: 'sugar', name: 'Sugar', buyingPrice: 3200, sellingPrice: 4000, unitsPerWeek: 15 },
    ],
  },
  step3_strategy: {
    selectedPrice: 5000,
    expectedYield: 0,
    expectedPrice: 0,
    byProductRevenue: 0,
  },
  step4_vision: {
    pdfGenerated: false,
  },
};

test('simple mode browser PDF is generated as a full adaptive business report', async () => {
  const results = calculateRoadmap(retailState, 'retail');
  const blob = generatePDFBlob(retailState, results, 'retail');
  const bytes = Buffer.from(await blob.arrayBuffer());
  const text = bytes.toString('latin1');

  assert.equal(bytes.subarray(0, 4).toString('latin1'), '%PDF');
  assert.ok(bytes.byteLength > 20000);
  assert.match(text, /Your Business at a Glance/);
  assert.match(text, /Your Products and What They Earn/);
  assert.match(text, /Your Monthly Costs/);
  assert.match(text, /Your Next Steps - Action Plan/);
});
