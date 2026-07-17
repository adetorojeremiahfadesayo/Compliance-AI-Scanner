import test from 'node:test';
import assert from 'node:assert/strict';
import { getRouteContext } from './appShellModel.js';

test('maps known routes to operational context', () => {
  assert.deepEqual(getRouteContext('/'), { section: 'Workspace', page: 'Analysis Hub' });
  assert.deepEqual(getRouteContext('/new-analysis'), { section: 'Workspace', page: 'Configuration Hub' });
  assert.deepEqual(getRouteContext('/analysis/42'), { section: 'Analysis', page: 'Scan Confidence' });
  assert.deepEqual(getRouteContext('/report/42'), { section: 'Analysis', page: 'Confidence Report' });
});

test('returns a neutral context for an unknown route', () => {
  assert.deepEqual(getRouteContext('/missing'), { section: 'Workspace', page: 'Compliance Autopilot' });
});
