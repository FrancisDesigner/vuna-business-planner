import test from 'node:test';
import assert from 'node:assert/strict';

import { getExpertReportSourceStatus } from './expertReportSource';

test('report source prefers backend authoritative when paid, online, and fresh', () => {
  const status = getExpertReportSourceStatus({
    authState: 'signed_in_paid',
    isOnline: true,
    hasFreshValidatedResult: true,
    lastGeneratedSource: 'local_fallback',
  });

  assert.equal(status.recommendedSource, 'backend_authoritative');
  assert.match(status.readinessLabel, /Backend authoritative/i);
  assert.match(status.helperMessage, /not manually controlled by a Vuna admin panel/i);
});

test('report source falls back locally when offline even for paid users', () => {
  const status = getExpertReportSourceStatus({
    authState: 'signed_in_paid',
    isOnline: false,
    hasFreshValidatedResult: true,
    lastGeneratedSource: null,
  });

  assert.equal(status.recommendedSource, 'local_fallback');
  assert.match(status.readinessMessage, /until Railway is reachable again/i);
});

test('report source blocks generation guidance when validation is stale', () => {
  const status = getExpertReportSourceStatus({
    authState: 'anonymous',
    isOnline: true,
    hasFreshValidatedResult: false,
    lastGeneratedSource: 'backend_authoritative',
  });

  assert.match(status.readinessLabel, /Validation required/i);
  assert.equal(status.lastGeneratedLabel, 'Backend authoritative');
});
