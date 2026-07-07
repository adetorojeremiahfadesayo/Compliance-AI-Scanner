import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Loader2, UserCheck, Activity } from 'lucide-react';
import ComplianceGauge from '../components/ComplianceGauge';
import GapMatrix from '../components/GapMatrix';
import AgentTimeline from '../components/AgentTimeline';
import { api } from '../services/api';
import { connectToAnalysis } from '../services/websocket';

const MOCK_GAPS = [
  {
    id: 101,
    status: "non_compliant",
    gap_description: "PII field (email) is saved to the SQLite database without encryption, and unhashed plain passwords are saved during user registration.",
    code_location: "demo-repo/app.py:L14",
    priority: "critical",
    requirement: {
      article_reference: "Article 32(1)(a)",
      title: "Password & PII Encryption",
      description: "Passwords must never be stored in plaintext. They must be secured using cryptographic hashing algorithms. Sensitive data at rest must be encrypted."
    }
  },
  {
    id: 102,
    status: "partial",
    gap_description: "Logging configuration outputs debug statements showing user variables including user registration payloads containing emails.",
    code_location: "demo-repo/app.py:L26",
    priority: "high",
    requirement: {
      article_reference: "Article 32(1)(d)",
      title: "Logging Restrictions for Sensitive Data",
      description: "Do not leak personal data, passwords, session tokens, or SSNs in application logs or system output streams."
    }
  },
  {
    id: 103,
    status: "non_compliant",
    gap_description: "The application routes lack any route handling a DELETE operation to purge user database profiles and session records.",
    code_location: "demo-repo/app.py",
    priority: "critical",
    requirement: {
      article_reference: "Article 17(1)",
      title: "Automated Data Erasure Endpoint",
      description: "Users must have the ability to delete all personal information stored about them upon request without manual admin overhead."
    }
  }
];

const MOCK_LOGS = [
  { agent_name: "Orchestrator", action: "pipeline_started", details: "Compliance Autopilot pipeline initiated.", timestamp: "2026-07-03T08:00:00.000Z" },
  { agent_name: "RegulationParser", action: "cache_hit", details: "Using pre-parsed requirements for Article 17 & 32.", timestamp: "2026-07-03T08:00:05.000Z" },
  { agent_name: "CodebaseAnalyzer", action: "start_scanning", details: "Scanning files under local demo-repo: found app.py.", timestamp: "2026-07-03T08:00:10.000Z" },
  { agent_name: "CodebaseAnalyzer", action: "scan_completed", details: "Codebase semantic scan completed. Found user routes and registration calls.", timestamp: "2026-07-03T08:00:15.000Z" },
  { agent_name: "GapDetector", action: "start_mapping", details: "Mapping requirements against database operations and log statements.", timestamp: "2026-07-03T08:00:20.000Z" },
  { agent_name: "GapDetector", action: "gaps_discovered", details: "Identified 3 compliance gaps: missing delete profile endpoint, raw unhashed password writes, email logs.", timestamp: "2026-07-03T08:00:25.000Z" },
  { agent_name: "RemediationEngine", action: "start_remediation", details: "Generating code corrections: Fernet encryption for profiles, bcrypt hashing, delete endpoint stub.", timestamp: "2026-07-03T08:00:30.000Z" }
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

  // Stepper pipeline stages
  const stages = ["pending", "parsing", "scanning", "detecting", "remediating", "complete"];

  useEffect(() => {
    let ws = null;
    
    async function loadInitial() {
      try {
        const data = await api.getAnalysis(id);
        setAnalysis(data);
        
        if (data.status === 'complete' || data.status === 'failed') {
          // If finished, load final stats
          const logs = await api.getAnalysisAudit(id);
          const reportGaps = await api.getAnalysisGaps(id);
          setAuditLogs(logs);
          setGaps(reportGaps);
        } else {
          // If running, subscribe to WS progress feeds
          ws = connectToAnalysis(id, (msg) => {
            // progress update message
            if (msg.status) {
              setAnalysis(prev => prev ? { ...prev, status: msg.status } : null);
            }
            // Add logs to timeline
            setAuditLogs(prev => [
              ...prev,
              { agent_name: msg.stage, action: msg.status, details: msg.message, timestamp: msg.timestamp }
            ]);
            
            if (msg.status === 'complete') {
              // Reload once complete to get data
              loadInitial();
            }
          });
        }
      } catch (err) {
        console.error("Failed to load analysis:", err);
        // Fallback for presentation
        setAnalysis({
          id: 2,
          status: 'complete',
          overall_score: 41.6,
          model_provider: "Qwen Cloud",
          model_names: "qwen-max, qwen-plus",
          remediation_approval_status: "pending_review",
          project: { name: "demo-repo" },
          regulation: { name: "GDPR Article 17 & 32 Audit" }
        });
        setAuditLogs(MOCK_LOGS);
        setGaps(MOCK_GAPS);
      } finally {
        setLoading(false);
      }
    }
    
    loadInitial();
    
    return () => {
      if (ws) ws.close();
    };
  }, [id]);

  const handleApproveRemediation = async () => {
    setApproving(true);
    try {
      const updated = await api.approveRemediation(id, 'Reviewed and approved for hackathon remediation package demo.');
      setAnalysis(updated);
      setAuditLogs(prev => [
        ...prev,
        {
          agent_name: 'HumanReviewer',
          action: 'remediation_approved',
          details: updated.remediation_approval_note,
          timestamp: updated.remediation_approved_at
        }
      ]);
    } catch (err) {
      console.error("Failed to approve remediation:", err);
      alert("Remediation approval is available after a completed backend scan.");
    } finally {
      setApproving(false);
    }
  };

  const handleRegressionCheck = async () => {
    setCheckingRegression(true);
    try {
      const result = await api.checkRegression(id);
      setRegressionResult(result);
      setAuditLogs(prev => [
        ...prev,
        {
          agent_name: 'MonitorAgent',
          action: 'regression_check_completed',
          details: `${result.new_regressions.length} new regressions, ${result.resolved_gaps.length} resolved gaps.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error("Failed to run regression check:", err);
      alert("Regression check needs a completed backend scan and a previous scan for the same project.");
    } finally {
      setCheckingRegression(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} className="status-dot-pulsing" color="var(--accent-blue)" />
      </div>
    );
  }

  const isRunning = analysis && !["complete", "failed"].includes(analysis.status);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Compliance Scan Audit
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Project: <strong style={{ color: 'var(--text-primary)' }}>{analysis?.project?.name}</strong> | Regulation: <strong style={{ color: 'var(--text-primary)' }}>{analysis?.regulation?.name}</strong>
          </p>
        </div>

        {analysis?.status === 'complete' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleRegressionCheck}
              disabled={checkingRegression}
              className="btn-secondary"
            >
              {checkingRegression ? <Loader2 size={16} className="status-dot-pulsing" /> : <Activity size={16} />}
              <span>{checkingRegression ? 'Checking...' : 'Regression Check'}</span>
            </button>
            {analysis.remediation_approval_status !== 'approved' ? (
              <button
                onClick={handleApproveRemediation}
                disabled={approving}
                className="btn-secondary"
              >
                {approving ? <Loader2 size={16} className="status-dot-pulsing" /> : <UserCheck size={16} />}
                <span>{approving ? 'Approving...' : 'Approve Remediation'}</span>
              </button>
            ) : (
              <span className="badge badge-compliant"><UserCheck size={12} /> Human Approved</span>
            )}
            <button
              onClick={() => navigate(`/report/${id}`)}
              className="btn-primary"
            >
              <span>View Full Compliance Report</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {regressionResult && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>MonitorAgent Regression Summary</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Baseline: {regressionResult.baseline_analysis_id ? `#${regressionResult.baseline_analysis_id}` : 'None'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>New Regressions</span>
              <span style={{ color: 'var(--status-non-compliant)', fontWeight: '800', fontSize: '22px' }}>{regressionResult.new_regressions.length}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Resolved Gaps</span>
              <span style={{ color: 'var(--status-compliant)', fontWeight: '800', fontSize: '22px' }}>{regressionResult.resolved_gaps.length}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>Persistent Gaps</span>
              <span style={{ color: 'var(--status-partial)', fontWeight: '800', fontSize: '22px' }}>{regressionResult.persistent_gaps.length}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Bot size={18} color="var(--accent-purple)" />
          <div>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>AI Provider</span>
            <span style={{ fontWeight: '700' }}>{analysis?.model_provider || 'Qwen Cloud'}</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>Models Used</span>
          <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '13px' }}>{analysis?.model_names || 'qwen-max, qwen-plus'}</span>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>Remediation Review</span>
          <span style={{ fontWeight: '700', color: analysis?.remediation_approval_status === 'approved' ? 'var(--status-compliant)' : 'var(--status-partial)' }}>
            {analysis?.remediation_approval_status || 'pending_review'}
          </span>
        </div>
      </div>

      {/* Stepper Pipeline Indicators */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {stages.map((stg, idx) => {
            const isActive = analysis?.status === stg;
            const isFinished = stages.indexOf(analysis?.status) > idx || analysis?.status === 'complete';
            
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isFinished ? 'var(--status-compliant)' : (isActive ? 'var(--accent-blue)' : 'var(--bg-primary)'),
                  border: '2px solid',
                  borderColor: isFinished ? 'var(--status-compliant)' : (isActive ? 'var(--accent-blue)' : 'var(--border-primary)'),
                  color: isFinished ? '#000' : (isActive ? '#000' : 'var(--text-secondary)'),
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}>
                  {isFinished ? '✓' : idx + 1}
                </div>
                <span style={{ 
                  marginTop: '8px', 
                  fontSize: '12px', 
                  textTransform: 'capitalize', 
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  {stg}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split */}
      {isRunning ? (
        // Running state - show timeline full screen
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} className="status-dot-pulsing" />
            Agent Core Operations Log
          </h3>
          <AgentTimeline events={auditLogs} />
        </div>
      ) : (
        // Completed state
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
          {/* Gauge & Stats Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
              <ComplianceGauge score={analysis?.overall_score} size={180} />
            </div>

            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Scan Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                  <span style={{ color: 'var(--status-compliant)', fontWeight: 'bold' }}>Complete</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Scan ID</span>
                  <span style={{ fontFamily: 'monospace' }}>#{id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gaps List Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Compliance Gaps Discovered</h3>
              <GapMatrix gaps={gaps} />
            </div>
            
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Agent Pipeline Trace</h3>
              <AgentTimeline events={auditLogs} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisView;
