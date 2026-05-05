import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PLANNER_CURRENCY_CODE,
  applyPlannerCurrencyPreference,
  getInvestmentGuidanceLimit,
  getPreferredPlannerCurrencyCode,
  normalizePlannerCurrencyCode,
  resolvePlannerMarketContext,
  storePlannerCurrencyPreference,
} from './marketContext';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

test('stored currency preference wins over detected market defaults', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: createMemoryStorage(), configurable: true });

  try {
    const kenyaContext = resolvePlannerMarketContext('KE');
    assert.ok(kenyaContext);
    applyPlannerCurrencyPreference(kenyaContext);
    assert.equal(getPreferredPlannerCurrencyCode(), 'KES');

    storePlannerCurrencyPreference('UGX');
    assert.equal(getPreferredPlannerCurrencyCode(), 'UGX');

    applyPlannerCurrencyPreference(kenyaContext);
    assert.equal(getPreferredPlannerCurrencyCode(), 'UGX');
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
});

test('currency normalization and guidance limits are contextual', () => {
  assert.equal(normalizePlannerCurrencyCode('usd'), 'USD');
  assert.equal(normalizePlannerCurrencyCode('not-real'), DEFAULT_PLANNER_CURRENCY_CODE);
  assert.equal(getInvestmentGuidanceLimit('UGX'), 100_000_000);
  assert.equal(getInvestmentGuidanceLimit('USD'), 30_000);
  assert.equal(getInvestmentGuidanceLimit('KES'), 4_000_000);
});
