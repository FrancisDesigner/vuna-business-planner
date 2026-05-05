import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExpertDashboardInsights, calculateRevenueMultipleValuation, EXPERT_UGANDA_HURDLE_RATE } from './expertInsights';
import { DEFAULT_EXPERT_FORM_STATE } from './expertPlanner';

test('revenue multiple valuation returns sector-specific ranges', () => {
  const range = calculateRevenueMultipleValuation(120_000_000, 'Retail');

  assert.ok(range);
  assert.equal(range?.sectorLabel, 'Retail');
  assert.equal(range?.low, 96_000_000);
  assert.equal(range?.high, 180_000_000);
});

test('expert dashboard insights build positive spread and valuation guidance', () => {
  const insights = buildExpertDashboardInsights(
    {
      ...DEFAULT_EXPERT_FORM_STATE,
      annualRevenue: '180000000',
      industry: 'Manufacturing',
      debtAmount: '20000000',
      equityAmount: '30000000',
    },
    {
      engine: 'python-expert-validation',
      discount_rate_percent: 17.6,
      invested_capital: 50_000_000,
      wacc: 0.176,
      roic: 0.22,
      return_spread: 0.044,
      terminal_value: 10_000_000,
      npv: 4_500_000,
      irr: 0.24,
    },
  );

  assert.equal(insights.headlineLabel, 'Return Spread');
  assert.equal(insights.headlineTone, 'positive');
  assert.ok((insights.dcfIntrinsicValue ?? 0) > 50_000_000);
  assert.ok(insights.revenueMultipleRange);
  assert.match(insights.regionalContextMessage, /25%/i);
  assert.equal(insights.hurdleBaselineRate, EXPERT_UGANDA_HURDLE_RATE);
});

test('expert dashboard falls back to IRR vs hurdle when spread is unavailable', () => {
  const insights = buildExpertDashboardInsights(
    {
      ...DEFAULT_EXPERT_FORM_STATE,
      annualRevenue: '',
      industry: 'Services',
    },
    {
      engine: 'python-expert-validation',
      discount_rate_percent: 15,
      invested_capital: 40_000_000,
      wacc: null,
      roic: null,
      return_spread: null,
      terminal_value: 0,
      npv: -500_000,
      irr: 0.13,
    },
  );

  assert.equal(insights.headlineLabel, 'IRR vs Hurdle');
  assert.equal(insights.headlineTone, 'negative');
  assert.equal(insights.revenueMultipleRange, null);
  assert.match(insights.dcfMessage, /intrinsic value/i);
});
