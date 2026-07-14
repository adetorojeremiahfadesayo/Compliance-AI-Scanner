import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertOctagon, PlusCircle, Clock, UserCheck, Server, Globe, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { DEMO_CODEBASES, INDUSTRIES } from '../data/regulations';
import ScanField from '../components/ScanField';
import CountUp from '../components/CountUp';

const LANG_TAGS = { 'Python (Flask)': 'PY', 'Python (FastAPI)': 'PY', 'Node.js (Express)': 'JS' };

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
      {/* Header: asymmetric split, scan field on the right */}
      <div className="reveal cols-hero" style={{ '--i': 0, marginBottom: '40px', minHeight: '260px' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '40px', fontWeight: '760', letterSpacing: '-0.02em', lineHeight: '1.04', marginBottom: '14px', maxWidth: '520px' }}>
            Software creation has never been{' '}
            <span style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: '640' }}>easier.</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.65', maxWidth: '460px', marginBottom: '24px' }}>
            But compliance still is. We're changing that: check if your software meets
            source-backed country and industry rules before you ship.
          </p>
          <button onClick={() => navigate('/new-analysis')} className="btn-primary" style={{ padding: '13px 26px', fontSize: '15px' }}>
            <span>Start a Scan</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="scanfield-wrap" style={{ position: 'relative', height: '280px', minWidth: 0 }}>
          <ScanField />
        </div>
      </div>

      {error && (
        <div className="reveal" style={{ '--i': 1, border: '1px solid rgba(var(--risk-rgb),0.35)', background: 'rgba(var(--risk-rgb),0.07)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Stat rail: hairline-divided cells, mono numerals */}
      <div className="dashboard-grid reveal" style={{ '--i': 1, marginBottom: '40px' }}>
        {[
          { label: 'Registered codebases', value: projects.length || DEMO_CODEBASES.length },
          { label: 'Scans run', value: analyses.length },
          { label: 'Avg compliance', value: Math.round(stats.avgCompliance), suffix: '%' },
          { label: 'Critical gaps', value: stats.criticalGaps, alert: stats.criticalGaps > 0 },
        ].map(({ label, value, suffix = '', alert }) => (
          <div key={label} className="stat-cell">
            <span className="label" style={{ display: 'block', marginBottom: '10px' }}>{label}</span>
            <CountUp
              value={value}
              suffix={suffix}
              style={{ fontSize: '30px', fontWeight: '500', color: alert ? 'var(--status-non-compliant)' : 'var(--text-primary)', lineHeight: 1 }}
            />
          </div>
        ))}
      </div>

      <div className="cols-main">
        {/* Left: Demo codebases + recent scans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          <div className="reveal" style={{ '--i': 2 }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>Demo Codebases</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_CODEBASES.map((cb, i) => {
                const ind = INDUSTRIES.find(x => x.id === cb.industry);
                return (
                  <div key={cb.id} className="row-item reveal" style={{ '--i': 3 + i }} onClick={() => navigate('/new-analysis')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: '4px 7px', flexShrink: 0 }}>
                        {LANG_TAGS[cb.language] || cb.language.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '650', fontSize: '14px', marginBottom: '3px' }}>{cb.name}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cb.description}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{ind?.label}</span>
                      <span className="mono" style={{ fontSize: '11.5px', color: 'var(--status-non-compliant)', whiteSpace: 'nowrap' }}>{cb.violations.length} violations</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reveal" style={{ '--i': 4 }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>Recent Scan Audits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading && (
                <div className="card scan-sweep" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading live scans…</div>
              )}

              {!loading && analyses.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '44px 24px' }}>
                  <Shield size={26} color="var(--accent)" strokeWidth={1.6} />
                  <h3 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '18px' }}>No scans yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', maxWidth: '380px', marginInline: 'auto' }}>
                    Launch a compliance scan to audit your codebase against country-specific industry rules.
                  </p>
                  <button onClick={() => navigate('/new-analysis')} className="btn-secondary">
                    <PlusCircle size={15} /><span>New Scan</span>
                  </button>
                </div>
              )}

              {analyses.map((analysis, i) => {
                let scoreColor = 'var(--status-non-compliant)';
                if (analysis.overall_score >= 80) scoreColor = 'var(--status-compliant)';
                else if (analysis.overall_score >= 60) scoreColor = 'var(--status-partial)';

                return (
                  <div key={analysis.id} className="row-item reveal" style={{ '--i': 5 + i }} onClick={() => navigate(`/analysis/${analysis.id}`)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                      <span style={{ fontSize: '14.5px', fontWeight: '650' }}>{analysis.project?.name || `Project #${analysis.project_id}`}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{analysis.regulation?.name || `Regulation #${analysis.regulation_id}`}</span>
                        <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{new Date(analysis.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: '16px', fontWeight: '500', color: scoreColor }}>{Math.round(analysis.overall_score || 0)}%</span>
                      {getStatusBadge(analysis)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card reveal" style={{ '--i': 3, padding: '20px' }}>
            <span className="label" style={{ display: 'block', marginBottom: '10px' }}>Human-approved packages</span>
            <CountUp value={stats.approvedPackages} style={{ fontSize: '28px', fontWeight: '500', color: 'var(--status-compliant)', lineHeight: 1 }} />
          </div>

          <div className="card reveal" style={{ '--i': 4, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Globe size={14} color="var(--accent)" strokeWidth={1.8} />
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Coverage</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Industries', value: '3 verticals' },
                { label: 'Countries', value: '25 countries' },
                { label: 'Frameworks', value: '15+ regulations' },
                { label: 'Continents', value: '5 regions' },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i > 0 ? '1px solid var(--border-primary)' : 'none', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card reveal" style={{ '--i': 5, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Server size={14} color="var(--accent)" strokeWidth={1.8} />
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Engine Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Provider</span>
                <span style={{ fontWeight: '650' }}>{deploymentProof?.deployment_provider || 'Compliance AutoPilot'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>AI Key</span>
                <span style={{ color: deploymentProof?.api_key_configured ? 'var(--status-compliant)' : 'var(--status-partial)', fontWeight: '650' }}>
                  {deploymentProof?.api_key_configured ? 'Configured' : 'Not detected'}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Models</span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{(deploymentProof?.models || ['CAP-Analyzer v2', 'CAP-GapDetector v1']).join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
