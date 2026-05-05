import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_EXPERT_FORM_STATE,
  buildExpertCaseSnapshot,
  buildExpertPlanPayload,
  buildExpertValidationPayload,
  getExpertVerdict,
  restoreExpertFormState,
} from './expertPlanner';

test('expert validation payload uses direct discount rate when capital structure is off', () => {
  const payload = buildExpertValidationPayload({
    ...DEFAULT_EXPERT_FORM_STATE,
    discountRatePercent: '18',
    useCapitalStructure: false,
    useTerminalValue: true,
    longTermGrowthRatePercent: '6',
  });

  assert.equal(payload.discount_rate_percent, 18);
  assert.equal(payload.debt_amount, undefined);
  assert.equal(payload.final_year_cash_flow, 20_000_000);
  assert.equal(payload.long_term_growth_rate_percent, 6);
});

test('expert validation payload builds WACC inputs when capital structure is enabled', () => {
  const payload = buildExpertValidationPayload({
    ...DEFAULT_EXPERT_FORM_STATE,
    useCapitalStructure: true,
    debtAmount: '10000000',
    equityAmount: '40000000',
    costOfDebtPercent: '22',
    costOfEquityPercent: '17',
    annualOperatingProfitAfterTax: '7000000',
  });

  assert.equal(payload.discount_rate_percent, undefined);
  assert.equal(payload.debt_amount, 10_000_000);
  assert.equal(payload.equity_amount, 40_000_000);
  assert.equal(payload.annual_operating_profit_after_tax, 7_000_000);
});

test('expert plan payload and snapshot include verdict text for saved and exported cases', () => {
  const form = {
    ...DEFAULT_EXPERT_FORM_STATE,
    caseName: 'Factory Upgrade',
    industry: 'Manufacturing',
  };
  const result = {
    engine: 'python-expert-validation',
    discount_rate_percent: 16,
    invested_capital: 50_000_000,
    wacc: 0.16,
    roic: 0.22,
    return_spread: 0.06,
    terminal_value: 10_000_000,
    npv: 4_200_000,
    irr: 0.24,
  };

  const payload = buildExpertPlanPayload(form, result, 'UGX');
  const snapshot = buildExpertCaseSnapshot(form, result, 'UGX');

  assert.equal(payload.mode, 'expert');
  assert.equal(payload.business_type, 'Manufacturing');
  assert.match(payload.results.verdict_headline, /Value appears/i);
  assert.equal(snapshot.name, 'Factory Upgrade');
  assert.equal(snapshot.results?.engine, 'python-expert-validation');
});

test('expert verdict warns when returns do not clear the hurdle rate', () => {
  const verdict = getExpertVerdict({
    engine: 'python-expert-validation',
    discount_rate_percent: 18,
    invested_capital: 40_000_000,
    wacc: 0.18,
    roic: 0.15,
    return_spread: -0.03,
    terminal_value: 0,
    npv: -500_000,
    irr: 0.12,
  });

  assert.match(verdict.headline, /Below hurdle rate/i);
});

test('restore expert form state keeps defaults for missing or invalid values', () => {
  const restored = restoreExpertFormState({
    caseName: 'Trader Expansion',
    useTerminalValue: true,
    debtAmount: 12345,
  });

  assert.equal(restored.caseName, 'Trader Expansion');
  assert.equal(restored.useTerminalValue, true);
  assert.equal(restored.debtAmount, DEFAULT_EXPERT_FORM_STATE.debtAmount);
  assert.equal(restored.industry, DEFAULT_EXPERT_FORM_STATE.industry);
});
