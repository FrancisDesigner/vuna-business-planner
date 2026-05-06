import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE,
  ADVANCED_PURCHASE_CYCLE_PHASE,
} from './advancedPurchaseCycleBridge';

test('advanced purchase cycle bridge keeps Phase 1 honest about weekly sales volume', () => {
  assert.equal(ADVANCED_PURCHASE_CYCLE_PHASE, 'weekly_sales_volume_phase_1');
  assert.match(ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE, /weekly sales volume/i);
  assert.match(ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE, /weekly estimate/i);
  assert.match(ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE, /Full stock purchase cycle support is coming/i);
});

test('advanced purchase cycle bridge does not claim full purchase cycle support is active', () => {
  assert.doesNotMatch(ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE, /already supports/i);
  assert.doesNotMatch(ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE, /fully handles/i);
});
