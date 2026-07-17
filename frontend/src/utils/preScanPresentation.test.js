import test from 'node:test';
import assert from 'node:assert/strict';

import { getPreScanCodebasePresentation } from './preScanPresentation.js';

test('pre-scan repository presentation contains facts but no inferred result', () => {
  const presentation = getPreScanCodebasePresentation({
    language: 'Node.js (Express)',
    linesOfCode: 158,
    files: ['server.js'],
    violations: ['No age verification'],
    scoreByCountry: { de: 22 },
  });

  assert.deepEqual(presentation, {
    language: 'Node.js (Express)',
    linesOfCode: 158,
    fileCount: 1,
    stateLabel: 'Awaiting scan',
  });
  assert.equal('score' in presentation, false);
  assert.equal('violations' in presentation, false);
});

test('pre-scan repository presentation handles missing optional metadata', () => {
  assert.deepEqual(getPreScanCodebasePresentation({}), {
    language: 'Repository',
    linesOfCode: 0,
    fileCount: 0,
    stateLabel: 'Awaiting scan',
  });
});
