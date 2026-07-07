import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertOctagon, Layers, PlusCircle, CheckCircle, Clock, Bot, UserCheck, PlayCircle, Server } from 'lucide-react';
import { api } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [deploymentProof, setDeploymentProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [fetchedProjects, fetchedAnalyses, proof] = await Promise.all([
          api.getProjects(),
          api.getAnalyses(),
          api.getDeploymentProof()
        ]);
        setProjects(fetchedProjects || []);
        setAnalyses(fetchedAnalyses || []);
        setDeploymentProof(proof);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError("Backend API is not reachable. Start FastAPI on port 8000 to load live scan data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDemoScan = async () => {
    setDemoLoading(true);
    try {
      const demo = await api.createDemoAnalysis();
      navigate(`/analysis/${demo.id}`);
    } catch (err) {
      console.error("Error creating demo scan:", err);
      setError("Could not create the one-click demo scan. Check that the backend API is running.");
    } finally {
      setDemoLoading(false);
    }
  };

  const stats = useMemo(() => {
    const completed = analyses.filter((analysis) => analysis.status === 'complete');
    const avgCompliance = completed.length
      ? completed.reduce((sum, analysis) => sum + Number(analysis.overall_score || 0), 0) / completed.length
      : 0;
    const criticalGaps = analyses
      .flatMap((analysis) => analysis.gaps || [])
      .filter((gap) => gap.priority === 'critical' && gap.status !== 'compliant')
      .length;
    const approvedPackages = analyses.filter((analysis) => analysis.remediation_approval_status === 'approved').length;

    return {
      avgCompliance,
      criticalGaps,
      approvedPackages
    };
  }, [analyses]);

  const getStatusBadge = (analysis) => {
    if (analysis.status === 'complete' && analysis.remediation_approval_status === 'approved') {
      return <span className="badge badge-compliant"><UserCheck size={12} /> Approved</span>;
    }
    if (analysis.status === 'complete') {
      return <span className="badge badge-partial"><Shield size={12} /> Review</span>;
    }
    if (analysis.status === 'failed') {
      return <span className="badge badge-non-compliant"><AlertOctagon size={12} /> Failed</span>;
    }
    return <span className="badge badge-pending"><Clock size={12} /> {analysis.status}</span>;
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Live Qwen Cloud compliance audit tracker</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleDemoScan}
            disabled={demoLoading}
            className="btn-secondary"
          >
            <PlayCircle size={16} />
            <span>{demoLoading ? 'Creating demo...' : 'One-Click Demo'}</span>
          </button>
          <button
            onClick={() => navigate('/new-analysis')}
            className="btn-primary"
          >
            <PlusCircle size={16} />
            <span>New Compliance Scan</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          border: '1px solid rgba(248, 81, 73, 0.35)',
          background: 'rgba(248, 81, 73, 0.08)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-blue)' }}>
            <Layers size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>Registered Codebases</span>
            <span style={{ fontSize: '24px', fontWeight: '700' }}>{projects.length}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(188, 140, 255, 0.1)', color: 'var(--accent-purple)' }}>
            <Bot size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>Qwen Scans Run</span>
            <span style={{ fontSize: '24px', fontWeight: '700' }}>{analyses.length}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(63, 185, 80, 0.1)', color: 'var(--status-compliant)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>Avg Compliance</span>
            <span style={{ fontSize: '24px', fontWeight: '700' }}>{Math.round(stats.avgCompliance)}%</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(248, 81, 73, 0.1)', color: 'var(--status-non-compliant)' }}>
            <AlertOctagon size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>Critical Gaps</span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--status-non-compliant)' }}>{stats.criticalGaps}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Recent Scan Audits</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading && (
              <div className="card" style={{ color: 'var(--text-secondary)' }}>Loading live scans...</div>
            )}

            {!loading && analyses.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <Shield size={28} color="var(--accent-blue)" />
                <h3 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '18px' }}>No scans yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  Launch a compliance pipeline to generate live Qwen-backed audit results.
                </p>
                <button onClick={() => navigate('/new-analysis')} className="btn-primary">
                  <PlusCircle size={16} />
                  <span>Start First Scan</span>
                </button>
              </div>
            )}

            {analyses.map((analysis) => {
              let scoreColor = 'var(--status-non-compliant)';
              if (analysis.overall_score >= 80) scoreColor = 'var(--status-compliant)';
              else if (analysis.overall_score >= 50) scoreColor = 'var(--status-partial)';

              return (
                <div
                  key={analysis.id}
                  onClick={() => navigate(`/analysis/${analysis.id}`)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {analysis.project?.name || `Project #${analysis.project_id}`}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{analysis.regulation?.name || `Regulation #${analysis.regulation_id}`}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-tertiary)' }} />
                      <span>{analysis.model_provider || 'Qwen Cloud'}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-tertiary)' }} />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: scoreColor,
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      {Math.round(analysis.overall_score || 0)}%
                    </span>
                    {getStatusBadge(analysis)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Active Codebases</h3>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {projects.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                Projects appear here after you connect a public GitHub repository for scanning.
              </p>
            )}

            {projects.map((proj) => (
              <div
                key={proj.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border-primary)'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: '600' }}>{proj.name}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                    {proj.repo_url ? proj.repo_url.replace('https://github.com/', '') : 'Local path'}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap'
                }}>
                  {proj.language}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '24px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '20px'
          }}>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Human-approved packages</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--status-compliant)' }}>{stats.approvedPackages}</span>
          </div>

          <div style={{
            marginTop: '24px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Server size={16} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Deployment Proof</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Provider</span>
                <span style={{ fontWeight: '700' }}>{deploymentProof?.deployment_provider || 'Alibaba Cloud'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Qwen Key</span>
                <span style={{ color: deploymentProof?.api_key_configured ? 'var(--status-compliant)' : 'var(--status-partial)', fontWeight: '700' }}>
                  {deploymentProof?.api_key_configured ? 'Configured' : 'Not detected'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Models</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  {(deploymentProof?.models || ['qwen-max', 'qwen-plus']).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
