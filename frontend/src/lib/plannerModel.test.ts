import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSharedPlannerOutputs,
  PLANNER_METRIC_REGISTRY,
  PLANNER_MODE_DEFINITIONS,
  getPlannerMetricDefinition,
  getPlannerModeDefinition,
} from './plannerModel';

test('planner metric registry covers shared finance backbone metrics', () => {
  assert.ok(PLANNER_METRIC_REGISTRY.profit);
  assert.ok(PLANNER_METRIC_REGISTRY.cash_position);
  assert.ok(PLANNER_METRIC_REGISTRY.roic);
  assert.ok(PLANNER_METRIC_REGISTRY.wacc);
  assert.ok(PLANNER_METRIC_REGISTRY.npv);
  assert.ok(PLANNER_METRIC_REGISTRY.irr);
  assert.ok(PLANNER_METRIC_REGISTRY.owner_distribution);
});

test('planner modes reflect intended scope boundaries', () => {
  const simple = getPlannerModeDefinition('simple');
  const advanced = getPlannerModeDefinition('advanced');
  const expert = getPlannerModeDefinition('expert');

  assert.equal(simple.capabilityRequirements.requiresBackend, false);
  assert.equal(advanced.capabilityRequirements.requiresPaidTier, true);
  assert.equal(expert.capabilityRequirements.requiresBackend, true);
  assert.ok(expert.supportedMetrics.includes('npv'));
  assert.ok(expert.supportedMetrics.includes('irr'));
  assert.ok(simple.hiddenMetrics.includes('wacc'));
});

test('metric helpers return exact registry entries', () => {
  const debtSafety = getPlannerMetricDefinition('interest_coverage');

  assert.equal(debtSafety.key, 'interest_coverage');
  assert.equal(debtSafety.displayByMode.advanced?.label, 'Debt safety');
  assert.equal(debtSafety.displayByMode.expert?.valueFormat, 'ratio');
  assert.equal(PLANNER_MODE_DEFINITIONS.advanced.mode, 'advanced');
});

test('shared planner outputs apply mode-specific explanations and warnings', () => {
  const outputs = buildSharedPlannerOutputs('advanced', {
    revenue: 1_000_000,
    variable_costs: 600_000,
    fixed_costs: 250_000,
    profit: 150_000,
    cash_position: 125_000,
    invested_capital: 3_000_000,
    debt_cost: 240_000,
    benchmark_rate: 0.14,
    interest_coverage: 1.2,
    roic: 0.18,
    reinvestment_need: 30_000,
    owner_distribution: 120_000,
  });

  assert.equal(outputs.explanations.interest_coverage, 'Shows how many times the business can cover its interest cost.');
  assert.ok(outputs.warnings.some((warning) => warning.metric === 'interest_coverage' && warning.severity === 'danger'));
  assert.equal(outputs.unavailableMetrics.includes('wacc'), false);
});
