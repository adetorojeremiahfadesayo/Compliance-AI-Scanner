import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfidenceState } from './confidenceModel.js';

test('maps confidence scores to semantic states', () => {
  assert.equal(getConfidenceState(84).tone, 'ok');
  assert.equal(getConfidenceState(64).tone, 'warning');
  assert.equal(getConfidenceState(41).tone, 'risk');
});

test('clamps out-of-range confidence scores', () => {
  assert.equal(getConfidenceState(140).score, 100);
  assert.equal(getConfidenceState(-20).score, 0);
});
