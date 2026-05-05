import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExpertCapitalStructureInsights } from './expertCapitalStructure';

test('capital structure insights identify room to borrow when coverage is strong', () => {
  const insights = buildExpertCapitalStructureInsights({
    debtAmount: 10_000_000,
    equityAmount: 40_000_000,
    annualOperatingProfit: 12_000_000,
    costOfDebtPercent: 12,
    costOfEquityPercent: 18,
  });

  assert.ok(insights);
  assert.equal(insights?.verdictStatus, 'room_to_borrow');
  assert.equal(insights?.currentRiskLevel, 'healthy');
  assert.ok((insights?.optimalDebtShare ?? 0) > (insights?.currentDebtShare ?? 0));
  assert.ok((insights?.curve.length ?? 0) >= 5);
});

test('capital structure insights flag excessive leverage when coverage is weak', () => {
  const insights = buildExpertCapitalStructureInsights({
    debtAmount: 35_000_000,
    equityAmount: 15_000_000,
    annualOperatingProfit: 4_000_000,
    costOfDebtPercent: 20,
    costOfEquityPercent: 16,
  });

  assert.ok(insights);
  assert.equal(insights?.verdictStatus, 'too_much_debt');
  assert.equal(insights?.currentRiskLevel, 'risky');
  assert.match(insights?.verdictMessage || '', /too much debt/i);
});

test('capital structure returns null without capital or earnings inputs', () => {
  const insights = buildExpertCapitalStructureInsights({
    debtAmount: 0,
    equityAmount: 0,
    annualOperatingProfit: 0,
    costOfDebtPercent: 20,
    costOfEquityPercent: 16,
  });

  assert.equal(insights, null);
});
