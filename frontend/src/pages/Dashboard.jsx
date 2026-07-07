import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertOctagon, Layers, PlusCircle, CheckCircle, Clock, Bot, UserCheck, Server, Globe, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { DEMO_CODEBASES, INDUSTRIES } from '../data/regulations';

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [deploymentProof, setDeploymentProof] = useState(null);
  const [loading, setLoading] = useState(true);
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
        console.error('Error loading dashboard data:', err);
        setError('Backend API is not reachable. Start FastAPI on port 8000 to load live scan data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const completed = analyses.filter(a => a.status === 'complete');
    const avgCompliance = completed.length
      ? completed.reduce((sum, a) => sum + Number(a.overall_score || 0), 0) / completed.length
      : 0;
    const criticalGaps = analyses.flatMap(a => a.gaps || []).filter(g => g.priority === 'critical' && g.status !== 'compliant').length;
    const approvedPackages = analyses.filter(a => a.remediation_approval_status === 'approved').length;
    return { avgCompliance, criticalGaps, approvedPackages };
  }, [analyses]);

  const getStatusBadge = (analysis) => {
    if (analysis.status === 'complete' && analysis.remediation_approval_status === 'approved')
      return <span className="badge badge-compliant"><UserCheck size={12} /> Approved</span>;
    if (analysis.status === 'complete')
      return <span className="badge badge-partial"><Shield size={12} /> Review</span>;
    if (analysis.status === 'failed')
      return <span className="badge badge-non-compliant"><AlertOctagon size={12} /> Failed</span>;
    return <span className="badge badge-pending"><Clock size={12} /> {analysis.status}</span>;
  };

  return (
    <div className="fade-in">
      {/* Hero Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)', letterSpacing: '1px' }}>
                GLOBAL COMPLIANCE ENGINE
              </div>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.8px', lineHeight: '1.1', marginBottom: '10px' }}>
              Software creation has never<br />
              <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                been easier.
              </span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', maxWidth: '500px' }}>
              But compliance still is. We're changing that — check if your software meets a country's specific industry rules in real time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => navigate('/new-analysis')} className="btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }}>
              <Sparkles size={17} />
              <span>Start a Scan</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ border: '1px solid rgba(248,81,73,0.35)', background: 'rgba(248,81,73,0.08)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        {[
          { icon: <Layers size={20} />, label: 'Registered Codebases', value: projects.length || DEMO_CODEBASES.length, color: 'var(--accent-blue)', bg: 'rgba(88,166,255,0.1)' },
          { icon: <Bot size={20} />, label: 'Scans Run', value: analyses.length, color: 'var(--accent-purple)', bg: 'rgba(188,140,255,0.1)' },
          { icon: <CheckCircle size={20} />, label: 'Avg Compliance', value: `${Math.round(stats.avgCompliance)}%`, color: 'var(--status-compliant)', bg: 'rgba(63,185,80,0.1)' },
          { icon: <AlertOctagon size={20} />, label: 'Critical Gaps', value: stats.criticalGaps, color: 'var(--status-non-compliant)', bg: 'rgba(248,81,73,0.1)' },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: bg, color }}>{icon}</div>
            <div>
              <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color }}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Left: Scans + Demo Codebases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Demo Codebases */}
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} color="var(--accent-blue)" /> Demo Codebases
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {DEMO_CODEBASES.map(cb => {
                const ind = INDUSTRIES.find(i => i.id === cb.industry);
                return (
                  <div
                    key={cb.id}
                    onClick={() => navigate('/new-analysis')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                      padding: '18px 20px', borderRadius: '12px', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-primary)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ind?.color + '60'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{ fontSize: '24px', flexShrink: 0 }}>{cb.languageIcon}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '3px' }}>{cb.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cb.description}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: `${ind?.color}15`, color: ind?.color, border: `1px solid ${ind?.color}30`, fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {ind?.icon} {ind?.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#F85149', fontWeight: '700' }}>{cb.violations.length} violations</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Scans */}
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>Recent Scan Audits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading && <div className="card" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading live scans…</div>}

              {!loading && analyses.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <Shield size={28} color="var(--accent-blue)" />
                  <h3 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '18px' }}>No scans yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                    Launch a compliance scan to audit your codebase against country-specific industry rules.
                  </p>
                  <button onClick={() => navigate('/new-analysis')} className="btn-primary">
                    <PlusCircle size={16} /><span>Start First Scan</span>
                  </button>
                </div>
              )}

              {analyses.map(analysis => {
                let scoreColor = 'var(--status-non-compliant)';
                if (analysis.overall_score >= 80) scoreColor = 'var(--status-compliant)';
                else if (analysis.overall_score >= 60) scoreColor = 'var(--status-partial)';

                return (
                  <div
                    key={analysis.id}
                    onClick={() => navigate(`/analysis/${analysis.id}`)}
                    style={{
                      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)', padding: '18px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: '600' }}>{analysis.project?.name || `Project #${analysis.project_id}`}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{analysis.regulation?.name || `Regulation #${analysis.regulation_id}`}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} />{new Date(analysis.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: scoreColor }}>{Math.round(analysis.overall_score || 0)}%</span>
                      {getStatusBadge(analysis)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Human-approved packages</span>
            <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--status-compliant)' }}>{stats.approvedPackages}</span>
          </div>

          {/* Coverage Map */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Globe size={15} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Coverage</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              {[
                { label: 'Industries', value: '3 verticals', icon: '🏭' },
                { label: 'Countries', value: '25 countries', icon: '🌍' },
                { label: 'Frameworks', value: '15+ regulations', icon: '📋' },
                { label: 'Continents', value: '5 regions', icon: '🗺️' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{icon}</span>{label}
                  </span>
                  <span style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Server size={15} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Engine Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Provider</span>
                <span style={{ fontWeight: '700' }}>{deploymentProof?.deployment_provider || 'Compliance AutoPilot'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>AI Key</span>
                <span style={{ color: deploymentProof?.api_key_configured ? 'var(--status-compliant)' : 'var(--status-partial)', fontWeight: '700' }}>
                  {deploymentProof?.api_key_configured ? 'Configured' : 'Not detected'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Models</span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{(deploymentProof?.models || ['CAP-Analyzer v2', 'CAP-GapDetector v1']).join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
