export function getPreScanCodebasePresentation(codebase = {}) {
  return {
    language: codebase.language || 'Repository',
    linesOfCode: Number(codebase.linesOfCode) || 0,
    fileCount: Array.isArray(codebase.files) ? codebase.files.length : 0,
    stateLabel: 'Awaiting scan',
  };
}
