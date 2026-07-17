export function getConfidenceState(value) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  const score = Math.max(0, Math.min(100, numeric));
  if (score >= 80) return { score, tone: 'ok', label: 'Strong confidence' };
  if (score >= 50) return { score, tone: 'warning', label: 'Review required' };
  return { score, tone: 'risk', label: 'Material gaps' };
}
