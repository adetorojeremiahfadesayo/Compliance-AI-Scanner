import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Loader2, UserCheck, Activity, Globe, Building2, GitPullRequest, Radar } from 'lucide-react';
import ComplianceGauge from '../components/ComplianceGauge';
import GapMatrix from '../components/GapMatrix';
import AgentTimeline from '../components/AgentTimeline';
import ComplianceReportModal from '../components/ComplianceReportModal';
import { api } from '../services/api';
import { connectToAnalysis } from '../services/websocket';

const DEMO_LOGS = (codebaseName, country, framework) => [
  { agent_name: 'Orchestrator', action: 'pipeline_started', details: `Compliance AutoPilot pipeline initiated for ${codebaseName}.`, timestamp: new Date(Date.now() - 7000).toISOString() },
  { agent_name: 'GeoRegulator', action: 'regulations_loaded', details: `Loaded ${framework} for ${country}. Regulatory authority confirmed.`, timestamp: new Date(Date.now() - 6000).toISOString() },
  { agent_name: 'CodebaseAnalyzer', action: 'start_scanning', details: `Scanning ${codebaseName} — parsing source files, routes, models and middleware.`, timestamp: new Date(Date.now() - 5000).toISOString() },
  { agent_name: 'CodebaseAnalyzer', action: 'scan_completed', details: `Semantic scan complete. Identified authentication flows, data models, API routes and logging patterns.`, timestamp: new Date(Date.now() - 4000).toISOString() },
  { agent_name: 'GapDetector', action: 'start_mapping', details: `Cross-referencing ${codebaseName} patterns against ${framework} requirements.`, timestamp: new Date(Date.now() - 3000).toISOString() },
  { agent_name: 'GapDetector', action: 'gaps_discovered', details: `Compliance gaps identified. Critical violations flagged for security, data rights and authentication controls.`, timestamp: new Date(Date.now() - 2000).toISOString() },
  { agent_name: 'RemediationEngine', action: 'start_remediation', details: `Generating targeted remediation plans based on ${framework} article requirements.`, timestamp: new Date(Date.now() - 1000).toISOString() },
  { agent_name: 'ScoreCalculator', action: 'score_computed', details: `Compliance confidence score computed. Report ready for human review.`, timestamp: new Date().toISOString() },
];

function AnalysisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [checkingRegression, setCheckingRegression] = useState(false);
  const [regressionResult, setRegressionResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [demoMeta, setDemoMeta] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState(null);
  const [togglingMonitor, setTogglingMonitor] = useState(false);

  const stages = ['pending', 'parsing', 'scanning', 'detecting', 'remediating', 'complete'];

  useEffect(() => {
    let ws = null;

    async function loadInitial() {
      // Check for demo result in sessionStorage first
      const demoRaw = sessionStorage.getItem('demoResult');
      if (demoRaw) {
        try {
          const demo = JSON.parse(demoRaw);
          // Only consume if IDs match
          if (id.startsWith('demo-')) {
            sessionStorage.removeItem('demoResult');
            setDemoMeta({ industryLabel: demo.industryLabel, countryLabel: demo.countryLabel, countryFlag: demo.countryFlag });
            setOfflineMode(!!demo.offlineDemo);
            setAnalysis(demo);
            setGaps(demo.gaps || []);
            setAuditLogs(DEMO_LOGS(demo.project?.name, demo.countryLabel, demo.framework));
            setLoading(false);
            // Auto-show modal after short delay
            setTimeout(() => setShowModal(true), 800);
            return;
          }
        } catch { /* ignore */ }
      }

      try {
        const data = await api.getAnalysis(id);
        setAnalysis(data);
        if (data.status === 'complete' || data.status === 'failed') {
          const logs = await api.getAnalysisAudit(id);
          const reportGaps = await api.getAnalysisGaps(id);
          setAuditLogs(logs);
          setGaps(reportGaps);
          setTimeout(() => setShowModal(true), 600);
        } else {
          ws = connectToAnalysis(id, (msg) => {
            if (msg.status) setAnalysis(prev => prev ? { ...prev, status: msg.status } : null);
            setAuditLogs(prev => [...prev, { agent_name: msg.stage, action: msg.status, details: msg.message, timestamp: msg.timestamp }]);
            if (msg.status === 'complete') loadInitial();
          });
        }
      } catch (err) {
        console.error('Failed to load analysis:', err);
        setOfflineMode(true);
        const fallback = {
          id: 2, status: 'complete', overall_score: 41.6,
          model_provider: 'Compliance AutoPilot Engine',
          model_names: 'CAP-Analyzer v2, CAP-GapDetector v1',
          remediation_approval_status: 'pending_review',
          project: { name: 'demo-repo' },
          regulation: { name: 'GDPR Article 17 & 32 Audit' },
          framework: 'GDPR + BaFin KWG', authority: 'BaFin'
        };
        setAnalysis(fallback);
        const { DEMO_CODEBASES } = await import('../data/regulations');
        const neobank = DEMO_CODEBASES[0];
        setGaps(neobank.violations.map((v, i) => ({
          id: i + 100, status: i < 3 ? 'non_compliant' : 'partial',
          gap_description: v, code_location: `demo-repo/app.py:L${20 + i * 15}`,
          priority: i < 3 ? 'critical' : 'high',
          requirement: { article_reference: `Art.32(1)(${String.fromCharCode(97 + i)})`, title: v.split(' ').slice(0, 4).join(' '), description: v, severity: i < 3 ? 'critical' : 'high', category: 'security' }
        })));
        setAuditLogs(DEMO_LOGS('demo-repo', 'Germany', 'GDPR + BaFin KWG'));
        setTimeout(() => setShowModal(true), 800);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
    return () => { if (ws) ws.close(); };
  }, [id]);

  const handleApproveRemediation = async () => {
    setApproving(true);
    try {
      const updated = await api.approveRemediation(id, 'Reviewed and approved.');
      setAnalysis(updated);
      setAuditLogs(prev => [...prev, { agent_name: 'HumanReviewer', action: 'remediation_approved', details: updated.remediation_approval_note, timestamp: updated.remediation_approved_at }]);
    } catch { alert('Remediation approval is available after a completed backend scan.'); }
    finally { setApproving(false); }
  };

  const handleCreateFixPr = async () => {
    setCreatingPr(true);
    setPrResult(null);
    try {
      const result = await api.createFixPr(id);
      setPrResult(result);
      setAuditLogs(prev => [...prev, {
        agent_name: 'RemediationEngine',
        action: result.status === 'created' ? 'fix_pr_created' : 'fix_pr_failed',
        details: result.pr_url || result.message,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      setPrResult({ status: 'failed', message: err.message });
    } finally {
      setCreatingPr(false);
    }
  };

  const handleToggleMonitoring = async () => {
    const project = analysis?.project;
    if (!project?.id) return;
    setTogglingMonitor(true);
    try {
      const updated = await api.setMonitoring(project.id, !project.monitor_enabled, project.monitor_interval_minutes || 60);
      setAnalysis(prev => prev ? { ...prev, project: updated } : prev);
    } catch (err) {
      alert(`Could not update monitoring: ${err.message}`);
    } finally {
      setTogglingMonitor(false);
    }
  };

  const handleRegressionCheck = async () => {
    setCheckingRegression(true);
    try {
      const result = await api.checkRegression(id);
      setRegressionResult(result);
      setAuditLogs(prev => [...prev, { agent_name: 'MonitorAgent', action: 'regression_check_completed', details: `${result.new_regressions.length} new regressions, ${result.resolved_gaps.length} resolved gaps.`, timestamp: new Date().toISOString() }]);
    } catch { alert('Regression check needs a completed backend scan and a previous scan for the same project.'); }
    finally { setCheckingRegression(false); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 size={36} className="status-dot-pulsing" color="var(--accent-blue)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Running compliance analysis…</p>
      </div>
    );
  }

  const isRunning = analysis && !['complete', 'failed'].includes(analysis.status);

  return (
    <div className="fade-in">
      {/* Confidence Score Modal */}
      {showModal && analysis?.status === 'complete' && (
        <ComplianceReportModal
          result={analysis}
          industry={demoMeta?.industryLabel || analysis?.industry_label || analysis?.industryLabel || 'Software'}
          country={demoMeta?.countryLabel || analysis?.country_label || analysis?.countryLabel || 'Global'}
          countryFlag={demoMeta?.countryFlag || analysis?.country_flag || analysis?.countryFlag || '🌍'}
          onClose={() => setShowModal(false)}
          onViewReport={() => { setShowModal(false); navigate(`/report/${id}`); }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Compliance Scan Audit</h1>
            {offlineMode && (
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: 'rgba(210,153,34,0.12)', border: '1px solid rgba(210,153,34,0.35)', color: '#D29922' }}>
                OFFLINE DEMO — backend unavailable
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{analysis?.project?.name}</strong></span>
            {demoMeta?.countryFlag && <><span style={{ color: 'var(--text-tertiary)' }}>·</span><span>{demoMeta.countryFlag} {demoMeta.countryLabel}</span></>}
            {demoMeta?.industryLabel && <><span style={{ color: 'var(--text-tertiary)' }}>·</span><span>{demoMeta.industryLabel}</span></>}
            {analysis?.country_label && <><span style={{ color: 'var(--text-tertiary)' }}>·</span><span>{analysis.country_flag} {analysis.country_label}</span></>}
            {analysis?.industry_label && <><span style={{ color: 'var(--text-tertiary)' }}>·</span><span>{analysis.industry_label}</span></>}
            {analysis?.framework && <><span style={{ color: 'var(--text-tertiary)' }}>·</span><span style={{ color: 'var(--accent-blue)' }}>{analysis.framework}</span></>}
          </p>
        </div>

        {analysis?.status === 'complete' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowModal(true)} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px' }}>
              <Activity size={15} /> Score Report
            </button>
            <button onClick={handleRegressionCheck} disabled={checkingRegression} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px' }}>
              {checkingRegression ? <Loader2 size={15} className="status-dot-pulsing" /> : <Activity size={15} />}
              {checkingRegression ? 'Checking…' : 'Regression Check'}
            </button>
            {analysis.remediation_approval_status !== 'approved' ? (
              <button onClick={handleApproveRemediation} disabled={approving} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px' }}>
                {approving ? <Loader2 size={15} className="status-dot-pulsing" /> : <UserCheck size={15} />}
                {approving ? 'Approving…' : 'Approve Remediation'}
              </button>
            ) : (
              <>
                <span className="badge badge-compliant"><UserCheck size={12} /> Human Approved</span>
                <button onClick={handleCreateFixPr} disabled={creatingPr} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px' }}>
                  {creatingPr ? <Loader2 size={15} className="status-dot-pulsing" /> : <GitPullRequest size={15} />}
                  {creatingPr ? 'Opening PR…' : 'Create Fix PR'}
                </button>
              </>
            )}
            {analysis?.project?.repo_url && (
              <button onClick={handleToggleMonitoring} disabled={togglingMonitor} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px' }}>
                {togglingMonitor ? <Loader2 size={15} className="status-dot-pulsing" /> : <Radar size={15} />}
                {analysis.project.monitor_enabled ? 'Monitoring: On' : 'Monitoring: Off'}
              </button>
            )}
            <button onClick={() => navigate(`/report/${id}`)} className="btn-primary" style={{ fontSize: '13px', padding: '10px 18px' }}>
              <span>Full Report</span><ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Fix PR result */}
      {prResult && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: `1px solid ${prResult.status === 'created' ? 'rgba(63,185,80,0.35)' : 'rgba(248,81,73,0.35)'}`,
          borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <GitPullRequest size={16} color={prResult.status === 'created' ? 'var(--status-compliant)' : 'var(--status-non-compliant)'} />
          <span style={{ fontSize: '13px' }}>{prResult.message}</span>
          {prResult.pr_url && (
            <a href={prResult.pr_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
              View pull request
            </a>
          )}
        </div>
      )}

      {/* Context Chips */}
      {(analysis?.framework || analysis?.authority) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
          {analysis.framework && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)', fontSize: '12px' }}>
              <Globe size={13} color="var(--accent-blue)" />
              <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{analysis.framework}</span>
            </div>
          )}
          {analysis.authority && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: 'rgba(188,140,255,0.08)', border: '1px solid rgba(188,140,255,0.2)', fontSize: '12px' }}>
              <Building2 size={13} color="var(--accent-purple)" />
              <span style={{ color: 'var(--accent-purple)', fontWeight: '600' }}>{analysis.authority}</span>
            </div>
          )}
        </div>
      )}

      {/* Regression result */}
      {regressionResult && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '18px 20px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>MonitorAgent Regression Summary</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Baseline: {regressionResult.baseline_analysis_id ? `#${regressionResult.baseline_analysis_id}` : 'None'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div><span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>New Regressions</span><span style={{ color: 'var(--status-non-compliant)', fontWeight: '800', fontSize: '22px' }}>{regressionResult.new_regressions.length}</span></div>
            <div><span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Resolved Gaps</span><span style={{ color: 'var(--status-compliant)', fontWeight: '800', fontSize: '22px' }}>{regressionResult.resolved_gaps.length}</span></div>
            <div><span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Persistent Gaps</span><span style={{ color: 'var(--status-partial)', fontWeight: '800', fontSize: '22px' }}>{regressionResult.persistent_gaps.length}</span></div>
          </div>
        </div>
      )}

      {/* Meta chips row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Bot size={16} color="var(--accent-purple)" />
          <div><span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Engine</span><span style={{ fontWeight: '700', fontSize: '13px' }}>{analysis?.model_provider || 'Compliance AutoPilot'}</span></div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Models</span>
          <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '12px' }}>{analysis?.model_names || 'CAP-Analyzer v2'}</span>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Remediation</span>
          <span style={{ fontWeight: '700', color: analysis?.remediation_approval_status === 'approved' ? 'var(--status-compliant)' : 'var(--status-partial)', fontSize: '13px' }}>
            {analysis?.remediation_approval_status || 'pending_review'}
          </span>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {stages.map((stg, idx) => {
            const isActive = analysis?.status === stg;
            const isFinished = stages.indexOf(analysis?.status) > idx || analysis?.status === 'complete';
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isFinished ? 'var(--status-compliant)' : isActive ? 'var(--accent-blue)' : 'var(--bg-primary)',
                  border: '2px solid', borderColor: isFinished ? 'var(--status-compliant)' : isActive ? 'var(--accent-blue)' : 'var(--border-primary)',
                  color: (isFinished || isActive) ? '#000' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '12px',
                  boxShadow: isActive ? '0 0 12px rgba(88,166,255,0.4)' : 'none',
                }}>
                  {isFinished ? '✓' : idx + 1}
                </div>
                <span style={{ marginTop: '6px', fontSize: '11px', textTransform: 'capitalize', fontWeight: isActive ? '700' : '400', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {stg}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      {isRunning ? (
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} className="status-dot-pulsing" /> Agent Core Operations Log
          </h3>
          <AgentTimeline events={auditLogs} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '36px 20px' }}>
              <ComplianceGauge score={analysis?.overall_score} size={180} />
            </div>
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Scan Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                {[
                  { k: 'Status', v: <span style={{ color: 'var(--status-compliant)', fontWeight: 'bold' }}>Complete</span> },
                  { k: 'Scan ID', v: <span style={{ fontFamily: 'monospace' }}>#{id}</span> },
                  { k: 'Total Gaps', v: analysis?.totalGaps || gaps.length },
                  { k: 'Critical', v: <span style={{ color: 'var(--status-non-compliant)', fontWeight: 'bold' }}>{analysis?.criticalGaps || gaps.filter(g => g.priority === 'critical').length}</span> },
                ].map(({ k, v }) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '20px' }}>Compliance Gaps Discovered</h3>
              <GapMatrix gaps={gaps} />
            </div>
            <div className="card">
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '20px' }}>Agent Pipeline Trace</h3>
              <AgentTimeline events={auditLogs} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisView;
