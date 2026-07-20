import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, FileSearch, GitPullRequest, Loader2, UserCheck } from 'lucide-react';
import CodeFixPanel from '../components/CodeFixPanel';
import AgentTimeline from '../components/AgentTimeline';
import ComplianceReportModal from '../components/ComplianceReportModal';
import ConfidenceInstrument from '../components/ConfidenceInstrument';
import PageContext from '../components/PageContext';
import OperationalPanel from '../components/OperationalPanel';
import ScanField from '../components/ScanField';
import { DEMO_CODEBASES } from '../data/regulations';
import { api } from '../services/api';
import { connectToAnalysis } from '../services/websocket';

const STAGES = ['pending', 'parsing', 'scanning', 'detecting', 'remediating', 'complete'];

const DEMO_LOGS = (codebaseName, country, framework) => [
  { agent_name: 'Orchestrator', action: 'pipeline_started', details: `Compliance AutoPilot pipeline initiated for ${codebaseName}.`, timestamp: new Date(Date.now() - 7000).toISOString() },
  { agent_name: 'GeoRegulator', action: 'regulations_loaded', details: `Loaded ${framework} for ${country}. Regulatory authority confirmed.`, timestamp: new Date(Date.now() - 6000).toISOString() },
  { agent_name: 'CodebaseAnalyzer', action: 'start_scanning', details: `Scanning ${codebaseName}: parsing source files, routes, models and middleware.`, timestamp: new Date(Date.now() - 5000).toISOString() },
  { agent_name: 'CodebaseAnalyzer', action: 'scan_completed', details: 'Semantic scan complete. Identified authentication flows, data models, API routes and logging patterns.', timestamp: new Date(Date.now() - 4000).toISOString() },
  { agent_name: 'GapDetector', action: 'start_mapping', details: `Cross-referencing ${codebaseName} patterns against ${framework} requirements.`, timestamp: new Date(Date.now() - 3000).toISOString() },
  { agent_name: 'GapDetector', action: 'gaps_discovered', details: 'Compliance gaps identified. Critical violations flagged for security, data rights and authentication controls.', timestamp: new Date(Date.now() - 2000).toISOString() },
  { agent_name: 'RemediationEngine', action: 'start_remediation', details: `Generating targeted remediation plans based on ${framework} article requirements.`, timestamp: new Date(Date.now() - 1000).toISOString() },
  { agent_name: 'ScoreCalculator', action: 'score_computed', details: 'Compliance confidence score computed. Report ready for human review.', timestamp: new Date().toISOString() },
];

function AnalysisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [demoMeta, setDemoMeta] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState(null);

  useEffect(() => {
    let ws = null;
    let modalTimer = 0;
    let cancelled = false;

    async function loadInitial() {
      const demoRaw = sessionStorage.getItem('demoResult');
      if (demoRaw && id.startsWith('demo-')) {
        try {
          const demo = JSON.parse(demoRaw);
          sessionStorage.removeItem('demoResult');
          if (cancelled) return;
          setDemoMeta({ industryLabel: demo.industryLabel, countryLabel: demo.countryLabel, countryFlag: demo.countryFlag });
          setOfflineMode(Boolean(demo.offlineDemo));
          setAnalysis(demo);
          setGaps(demo.gaps || []);
          setAuditLogs(DEMO_LOGS(demo.project?.name, demo.countryLabel, demo.framework));
          setLoading(false);
          modalTimer = window.setTimeout(() => setShowModal(true), 800);
          return;
        } catch {
          sessionStorage.removeItem('demoResult');
        }
      }

      try {
        const data = await api.getAnalysis(id);
        if (cancelled) return;
        setAnalysis(data);
        if (data.status === 'complete' || data.status === 'failed') {
          const [logs, reportGaps] = await Promise.all([api.getAnalysisAudit(id), api.getAnalysisGaps(id)]);
          if (cancelled) return;
          setAuditLogs(logs);
          setGaps(reportGaps);
          modalTimer = window.setTimeout(() => setShowModal(true), 600);
        } else {
          ws = connectToAnalysis(id, (message) => {
            if (message.status) setAnalysis((current) => current ? { ...current, status: message.status } : null);
            setAuditLogs((current) => [...current, { agent_name: message.stage, action: message.status, details: message.message, timestamp: message.timestamp }]);
            if (message.status === 'complete') loadInitial();
          });
        }
      } catch (error) {
        console.error('Failed to load analysis:', error);
        if (cancelled) return;
        setOfflineMode(true);
        const fallback = {
          id: 2,
          status: 'complete',
          overall_score: 41.6,
          model_provider: 'Compliance AutoPilot Engine',
          model_names: 'CAP-Analyzer v2, CAP-GapDetector v1',
          remediation_approval_status: 'pending_review',
          project: { name: 'demo-repo' },
          regulation: { name: 'GDPR Article 17 & 32 Audit' },
          framework: 'GDPR + BaFin KWG',
          authority: 'BaFin',
        };
        const neobank = DEMO_CODEBASES[0];
        setAnalysis(fallback);
        setGaps(neobank.violations.map((violation, index) => ({
          id: index + 100,
          status: index < 3 ? 'non_compliant' : 'partial',
          gap_description: violation,
          code_location: `demo-repo/app.py:L${20 + index * 15}`,
          priority: index < 3 ? 'critical' : 'high',
          requirement: {
            article_reference: `Art.32(1)(${String.fromCharCode(97 + index)})`,
            title: violation.split(' ').slice(0, 4).join(' '),
            description: violation,
            severity: index < 3 ? 'critical' : 'high',
            category: 'security',
          },
        })));
        setAuditLogs(DEMO_LOGS('demo-repo', 'Germany', 'GDPR + BaFin KWG'));
        modalTimer = window.setTimeout(() => setShowModal(true), 800);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
      window.clearTimeout(modalTimer);
      if (ws) ws.close();
    };
  }, [id]);

  const handleApproveRemediation = async () => {
    setApproving(true);
    try {
      const updated = await api.approveRemediation(id, 'Reviewed and approved.');
      setAnalysis(updated);
      setAuditLogs((current) => [...current, { agent_name: 'HumanReviewer', action: 'remediation_approved', details: updated.remediation_approval_note, timestamp: updated.remediation_approved_at }]);
    } catch {
      alert('Remediation approval is available after a completed backend scan.');
    } finally {
      setApproving(false);
    }
  };

  const handleCreateFixPr = async (gapIds = null) => {
    setCreatingPr(true);
    setPrResult(null);
    try {
      const result = await api.createFixPr(id, gapIds);
      setPrResult(result);
      setAuditLogs((current) => [...current, {
        agent_name: 'RemediationEngine',
        action: result.status === 'created' ? 'fix_pr_created' : 'fix_pr_failed',
        details: result.pr_url || result.message,
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      setPrResult({ status: 'failed', message: error.message });
    } finally {
      setCreatingPr(false);
    }
  };

  if (loading) {
    return (
      <div className="route-loading">
        <Loader2 size={30} className="status-dot-pulsing" />
        <p>Running compliance analysis</p>
      </div>
    );
  }

  const isRunning = analysis && !['complete', 'failed'].includes(analysis.status);
  const stageIndex = Math.max(0, STAGES.indexOf(analysis?.status));
  const progress = analysis?.status === 'complete' ? 100 : (stageIndex / (STAGES.length - 1)) * 100;
  const stageNodes = STAGES.map((stageName, index) => ({
    stage: stageName,
    status: index < stageIndex || analysis?.status === 'complete' ? 'complete' : index === stageIndex ? 'active' : 'pending',
  }));
  // This page is the "fix it" workspace — approve + generate/review/PR live
  // here front and center. Regression checks, monitoring, and auto-PR are
  // secondary/automation controls that live on the Full Report page instead.
  const pageActions = analysis?.status === 'complete' ? (
    <>
      {analysis.remediation_approval_status !== 'approved' ? (
        <button type="button" onClick={handleApproveRemediation} disabled={approving} className="btn-secondary compact-action">
          {approving ? <Loader2 size={15} className="status-dot-pulsing" /> : <UserCheck size={15} />}
          {approving ? 'Approving' : 'Approve Remediation'}
        </button>
      ) : (
        <span className="badge badge-compliant"><UserCheck size={12} /> Remediation approved</span>
      )}
    </>
  ) : null;

  return (
    <div className="confidence-workspace">
      {showModal && analysis?.status === 'complete' ? (
        <ComplianceReportModal
          result={analysis}
          industry={demoMeta?.industryLabel || analysis?.industry_label || analysis?.industryLabel || 'Software'}
          country={demoMeta?.countryLabel || analysis?.country_label || analysis?.countryLabel || 'Global'}
          countryFlag={demoMeta?.countryFlag || analysis?.country_flag || analysis?.countryFlag || ''}
          onClose={() => navigate(`/report/${id}`)}
          onViewReport={() => navigate(`/report/${id}`)}
        />
      ) : null}

      <PageContext
        title={analysis?.status === 'complete' ? 'Fix Issues' : 'Scan Confidence'}
        description={`${analysis?.project?.name || 'Repository'} against ${analysis?.regulation?.name || analysis?.framework || 'selected compliance controls'}.`}
        status={offlineMode ? <span className="badge badge-partial">Offline demo</span> : <span className={`badge ${analysis?.status === 'complete' ? 'badge-compliant' : 'badge-pending'}`}>{analysis?.status || 'pending'}</span>}
        actions={pageActions}
        backAction={{ label: 'Back to Analysis Hub', onClick: () => navigate('/') }}
      />

      {prResult ? (
        <div className={`system-alert ${prResult.status === 'created' ? 'system-alert--ok' : 'system-alert--risk'}`}>
          <GitPullRequest size={16} /><span>{prResult.message}</span>
          {prResult.pr_url ? <a href={prResult.pr_url} target="_blank" rel="noreferrer">View pull request</a> : null}
        </div>
      ) : null}

      {analysis?.status === 'complete' && !offlineMode ? (
        <>
          <CodeFixPanel
            analysisId={id}
            gaps={gaps}
            repoUrl={analysis?.project?.repo_url}
            approvalStatus={analysis?.remediation_approval_status}
            creatingPr={creatingPr}
            onCreatePr={handleCreateFixPr}
          />
          <div className="full-report-cta">
            <button type="button" onClick={() => navigate(`/report/${id}`)} className="btn-secondary compact-action">
              <FileSearch size={15} /> View Full Report <ArrowRight size={15} />
            </button>
            <p>Confidence score breakdown, requirement-by-requirement evidence, code audit view, regression checks, and monitoring/auto-PR automation controls.</p>
          </div>
        </>
      ) : (
        <>
          <section className="confidence-stage">
            <ConfidenceInstrument
              score={analysis?.overall_score || 0}
              status={analysis?.status || 'pending'}
              progress={progress}
              meta={[
                { label: 'Project', value: analysis?.project?.name },
                { label: 'Framework', value: analysis?.framework || analysis?.regulation?.name },
                { label: 'Authority', value: analysis?.authority },
                { label: 'Review', value: analysis?.remediation_approval_status || 'pending_review' },
              ]}
            />
            <div className="confidence-stage__field">
              <ScanField mode="evidence" stages={stageNodes} findings={gaps} />
              <div className="confidence-stage__field-label"><span>Evidence constellation</span><strong>{isRunning ? 'Pipeline active' : `${gaps.length} findings mapped`}</strong></div>
            </div>
          </section>

          <section className="stage-rail" aria-label="Scan stages">
            {stageNodes.map((stageItem, index) => (
              <div key={stageItem.stage} className={`stage-rail__item is-${stageItem.status}`}>
                <span>{stageItem.status === 'complete' ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span>
                <strong>{stageItem.stage}</strong>
              </div>
            ))}
          </section>

          <OperationalPanel title="Agent Core Operations" meta="Live pipeline trace"><div className="timeline-pad"><AgentTimeline events={auditLogs} /></div></OperationalPanel>
        </>
      )}
    </div>
  );
}

export default AnalysisView;
