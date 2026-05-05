import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getExpertLoadActionState,
  getExpertPdfActionState,
  getExpertSaveActionState,
} from './expertActionStates';

test('expert save stays disabled until a fresh validation exists', () => {
  const state = getExpertSaveActionState({
    authState: 'signed_in_paid',
    isOnline: true,
    hasFreshValidatedResult: false,
  });

  assert.equal(state.disabled, true);
  assert.match(state.helperMessage, /validation first/i);
});

test('expert load prompts anonymous users to sign in without blocking the click path', () => {
  const state = getExpertLoadActionState({
    authState: 'anonymous',
    isOnline: true,
  });

  assert.equal(state.disabled, false);
  assert.match(state.helperMessage, /Sign in/i);
});

test('expert pdf prefers authoritative delivery for paid online users', () => {
  const state = getExpertPdfActionState({
    authState: 'signed_in_paid',
    isOnline: true,
    hasFreshValidatedResult: true,
  });

  assert.equal(state.buttonLabel, 'Authoritative PDF');
  assert.equal(state.disabled, false);
});

test('expert pdf falls back locally for non-paid users when validation is fresh', () => {
  const state = getExpertPdfActionState({
    authState: 'signed_in_free',
    isOnline: true,
    hasFreshValidatedResult: true,
  });

  assert.equal(state.buttonLabel, 'Local PDF');
  assert.equal(state.disabled, false);
});
