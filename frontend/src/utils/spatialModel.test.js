import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpatialModel } from './spatialModel.js';

test('analysis mode produces stable project nodes', () => {
  const input = {
    mode: 'analysis',
    projects: [{ id: 7, name: 'ledger' }, { id: 8, name: 'gateway' }],
    analyses: [],
  };

  const first = buildSpatialModel(input);
  const second = buildSpatialModel(input);

  assert.deepEqual(first, second);
  assert.equal(first.nodes.length, 2);
  assert.deepEqual(first.nodes.map((node) => node.id), ['project-7', 'project-8']);
});

test('evidence mode retains finding severity and status', () => {
  const result = buildSpatialModel({
    mode: 'evidence',
    findings: [{ id: 3, priority: 'critical', status: 'non_compliant' }],
  });

  assert.equal(result.nodes[0].severity, 'critical');
  assert.equal(result.nodes[0].status, 'non_compliant');
});

test('empty input returns an honest idle model', () => {
  const result = buildSpatialModel({ mode: 'analysis' });

  assert.deepEqual(result.nodes, []);
  assert.deepEqual(result.links, []);
  assert.equal(result.intensity, 0);
});

test('links only reference nodes in the model', () => {
  const result = buildSpatialModel({
    mode: 'evidence',
    stages: [{ stage: 'parser' }, { stage: 'analysis' }, { stage: 'gaps' }],
  });
  const ids = new Set(result.nodes.map((node) => node.id));

  assert.ok(result.links.length > 0);
  assert.ok(result.links.every((link) => ids.has(link.source) && ids.has(link.target)));
});

test('explicit focus id passes through unchanged', () => {
  const result = buildSpatialModel({
    mode: 'analysis',
    projects: [{ id: 7 }],
    focusId: 'project-7',
  });

  assert.equal(result.focusId, 'project-7');
});
