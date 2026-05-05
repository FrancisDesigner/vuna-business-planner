import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import type { ExpertValidationPayload } from './plannerApi';
import { calculateExpertFinanceCase } from './expertPlanner';

interface ExpertParityCase {
  id: string;
  inputs: ExpertValidationPayload;
  expected: {
    discount_rate_percent: number | null;
    invested_capital: number;
    wacc: number | null;
    roic: number | null;
    return_spread: number | null;
    terminal_value: number;
    npv: number | null;
    irr: number | null;
  };
}

const FLOAT_TOLERANCE = 0.01;
const RATE_TOLERANCE = 0.000001;

function assertClose(actual: number | null, expected: number | null, tolerance: number, label: string) {
  assert.notEqual(actual, null, `${label}: expected a number, received null`);
  assert.notEqual(expected, null, `${label}: expected fixture should not be null`);
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

const parityCases = JSON.parse(
  readFileSync(new URL('../../../shared-fixtures/expert_parity_cases.json', import.meta.url), 'utf8'),
) as ExpertParityCase[];

for (const parityCase of parityCases) {
  test(`expert parity fixture stays aligned for ${parityCase.id}`, () => {
    const result = calculateExpertFinanceCase(parityCase.inputs);

    assert.equal(result.discount_rate_percent === null, parityCase.expected.discount_rate_percent === null);
    assert.equal(result.wacc === null, parityCase.expected.wacc === null);
    assert.equal(result.roic === null, parityCase.expected.roic === null);
    assert.equal(result.return_spread === null, parityCase.expected.return_spread === null);

    assertClose(result.invested_capital, parityCase.expected.invested_capital, FLOAT_TOLERANCE, 'invested_capital');
    assertClose(result.terminal_value, parityCase.expected.terminal_value, FLOAT_TOLERANCE, 'terminal_value');

    if (parityCase.expected.discount_rate_percent !== null) {
      assertClose(result.discount_rate_percent, parityCase.expected.discount_rate_percent, RATE_TOLERANCE, 'discount_rate_percent');
    }
    if (parityCase.expected.wacc !== null) {
      assertClose(result.wacc, parityCase.expected.wacc, RATE_TOLERANCE, 'wacc');
    }
    if (parityCase.expected.roic !== null) {
      assertClose(result.roic, parityCase.expected.roic, RATE_TOLERANCE, 'roic');
    }
    if (parityCase.expected.return_spread !== null) {
      assertClose(result.return_spread, parityCase.expected.return_spread, RATE_TOLERANCE, 'return_spread');
    }
    if (parityCase.expected.npv !== null) {
      assertClose(result.npv, parityCase.expected.npv, FLOAT_TOLERANCE, 'npv');
    }
    if (parityCase.expected.irr !== null) {
      assertClose(result.irr, parityCase.expected.irr, RATE_TOLERANCE, 'irr');
    }
  });
}
