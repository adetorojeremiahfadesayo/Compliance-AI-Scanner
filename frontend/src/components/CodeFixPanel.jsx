import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, FileDiff } from 'lucide-react';
import { api } from '../services/api';

// "Findings to correct" workflow: generates real corrected file content per
// finding (not just a text plan), lets the reviewer pick which findings to
// include, preview the actual diff, and choose between reviewing it first or
// shipping it straight into the fix PR.
function CodeFixPanel({ analysisId, gaps, repoUrl, approvalStatus, onCreatePr, creatingPr }) {
  const actionableGaps = useMemo(
    () => gaps.filter((gap) => gap.status !== 'compliant' && gap.remediation_plan),
    [gaps],
  );

  const [selectedIds, setSelectedIds] = useState(() => new Set(actionableGaps.map((g) => g.id)));
  const [fixes, setFixes] = useState({}); // gap_id -> CodeFixResponse
  const [generating, setGenerating] = useState(false);
  const [activeGapId, setActiveGapId] = useState(null);
  const [workflow, setWorkflow] = useState('review'); // 'review' | 'pr'

  useEffect(() => {
    setSelectedIds(new Set(actionableGaps.map((g) => g.id)));
  }, [actionableGaps]);

  useEffect(() => {
    let cancelled = false;
    api.getCodeFixes(analysisId).then((results) => {
      if (cancelled) return;
      const byId = {};
      results.forEach((r) => { byId[r.gap_id] = r; });
      setFixes(byId);
      const firstWithDiff = results.find((r) => r.has_fix);
      if (firstWithDiff) setActiveGapId(firstWithDiff.gap_id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [analysisId]);

  if (actionableGaps.length === 0) return null;

  const toggle = (gapId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(gapId)) next.delete(gapId);
      else next.add(gapId);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(actionableGaps.map((g) => g.id)));
  const selectNone = () => setSelectedIds(new Set());

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const results = await api.generateFixes(analysisId, Array.from(selectedIds));
      setFixes((current) => {
        const next = { ...current };
        results.forEach((r) => { next[r.gap_id] = r; });
        return next;
      });
      const firstWithDiff = results.find((r) => r.has_fix);
      if (firstWithDiff) setActiveGapId(firstWithDiff.gap_id);
    } catch (error) {
      alert(`Could not generate fixes: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const fixCount = Object.values(fixes).filter((f) => f.has_fix).length;
  const activeFix = activeGapId ? fixes[activeGapId] : null;
  const canCreatePr = repoUrl && approvalStatus === 'approved';

  return (
    <section className="code-fix-panel">
      <header className="code-fix-panel__header">
        <div>
          <h3><Sparkles size={16} /> Findings to correct</h3>
          <p>Generate real corrected file content per finding, review the diff, then choose how it ships.</p>
        </div>
        <div className="code-fix-panel__workflow" role="radiogroup" aria-label="Workflow">
          <button type="button" className={workflow === 'review' ? 'is-active' : ''} onClick={() => setWorkflow('review')}>
            Review code
          </button>
          <button type="button" className={workflow === 'pr' ? 'is-active' : ''} onClick={() => setWorkflow('pr')} disabled={!repoUrl}>
            Create GitHub PR
          </button>
        </div>
      </header>

      <div className="code-fix-panel__body">
        <div className="code-fix-panel__list">
          <div className="code-fix-panel__list-head">
            <span>{selectedIds.size}/{actionableGaps.length} selected</span>
            <span>
              <button type="button" onClick={selectAll}>Select all</button>
              {' · '}
              <button type="button" onClick={selectNone}>None</button>
            </span>
          </div>
          {actionableGaps.map((gap) => {
            const fix = fixes[gap.id];
            return (
              <label key={gap.id} className={`code-fix-panel__item priority-${gap.priority} ${activeGapId === gap.id ? 'is-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(gap.id)}
                  onChange={() => toggle(gap.id)}
                />
                <div onClick={() => fix?.has_fix && setActiveGapId(gap.id)} style={{ cursor: fix?.has_fix ? 'pointer' : 'default' }}>
                  <span className="code-fix-panel__badge">{gap.priority}</span>
                  <strong>{gap.requirement?.title}</strong>
                  <span className="code-fix-panel__location">{gap.code_location || 'No file reference'}</span>
                  {fix?.has_fix ? (
                    <span className="code-fix-panel__status is-ready"><CheckCircle2 size={12} /> Fix ready</span>
                  ) : fix?.error ? (
                    <span className="code-fix-panel__status is-error">{fix.error}</span>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>

        <div className="code-fix-panel__diff">
          {activeFix?.diff ? (
            <>
              <div className="code-fix-panel__diff-head"><FileDiff size={14} /> {activeFix.file_path}</div>
              <pre>{activeFix.diff}</pre>
            </>
          ) : (
            <div className="code-fix-panel__diff-empty">
              {generating ? 'Generating corrected code…' : 'Select a finding with a ready fix to preview its diff, or generate fixes below.'}
            </div>
          )}
        </div>
      </div>

      <footer className="code-fix-panel__footer">
        <button type="button" className="btn-secondary compact-action" onClick={handleGenerate} disabled={generating || selectedIds.size === 0}>
          {generating ? <Loader2 size={15} className="status-dot-pulsing" /> : <Sparkles size={15} />}
          {generating ? 'Generating' : `Generate Fixes (${selectedIds.size})`}
        </button>

        {workflow === 'pr' ? (
          <button
            type="button"
            className="btn-primary compact-action"
            disabled={!canCreatePr || creatingPr || selectedIds.size === 0}
            title={!canCreatePr ? 'Approve remediation and register a GitHub repo URL first.' : ''}
            onClick={() => onCreatePr(Array.from(selectedIds))}
          >
            {creatingPr ? <Loader2 size={15} className="status-dot-pulsing" /> : <FileDiff size={15} />}
            {creatingPr ? 'Opening PR' : `Create PR with ${fixCount} fix(es)`}
          </button>
        ) : (
          <span className="code-fix-panel__hint">
            Reviewing only — nothing is pushed to GitHub. Switch to "Create GitHub PR" when ready.
          </span>
        )}
      </footer>
    </section>
  );
}

export default CodeFixPanel;
