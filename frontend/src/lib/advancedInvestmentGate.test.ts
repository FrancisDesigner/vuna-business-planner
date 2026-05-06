import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEffectiveAdvancedInvestmentForGate,
  shouldGateAdvancedInvestment,
} from './advancedInvestmentGate';

test('advanced investment gate uses equipment cost when planned investment is blank', () => {
  const effectiveInvestment = getEffectiveAdvancedInvestmentForGate({
    investmentSize: 0,
    equipmentCost: 80_000_000,
  });

  assert.equal(effectiveInvestment, 80_000_000);
  assert.equal(shouldGateAdvancedInvestment({
    investmentSize: 0,
    equipmentCost: 80_000_000,
    investmentGuidanceLimit: 50_000_000,
  }), true);
});

test('advanced investment gate uses planned investment when it is larger', () => {
  const effectiveInvestment = getEffectiveAdvancedInvestmentForGate({
    investmentSize: 80_000_000,
    equipmentCost: 10_000_000,
  });

  assert.equal(effectiveInvestment, 80_000_000);
  assert.equal(shouldGateAdvancedInvestment({
    investmentSize: 80_000_000,
    equipmentCost: 10_000_000,
    investmentGuidanceLimit: 50_000_000,
  }), true);
});

test('advanced investment gate allows cases below the guidance limit', () => {
  const effectiveInvestment = getEffectiveAdvancedInvestmentForGate({
    investmentSize: 20_000_000,
    equipmentCost: 10_000_000,
  });

  assert.equal(effectiveInvestment, 20_000_000);
  assert.equal(shouldGateAdvancedInvestment({
    investmentSize: 20_000_000,
    equipmentCost: 10_000_000,
    investmentGuidanceLimit: 50_000_000,
  }), false);
});
