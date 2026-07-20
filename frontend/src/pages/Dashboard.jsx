import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, ArrowUpRight, Clock, GitBranch, Plus, Radar, Server, Shield, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { INDUSTRIES } from '../data/regulations';
import ScanField from '../components/ScanField';
import CountUp from '../components/CountUp';
import PageContext from '../components/PageContext';
import OperationalPanel from '../components/OperationalPanel';

const LANG_TAGS = { 'Python (Flask)': 'PY', 'Python (FastAPI)': 'PY', 'Node.js (Express)': 'JS' };

// Wizard showcase repos (NeoBank + the real NodeGoat/Vulpy/Ghostfolio/Navidrome
// scans) live only inside the New Scan flow, keyed to industry+country — the
// dashboard should read as a clean workspace, not pre-seeded with demo data.
const SHOWCASE_PROJECT_NAMES = new Set([
  'NeoBank API',
  'NodeGoat (OWASP demo fork)',
  'Vulpy (deliberately vulnerable Flask app)',
  'Ghostfolio (Open Source Wealth Management)',
  'Navidrome (Self-hosted Music Streaming)',
]);

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [deploymentProof, setDeploymentProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusedRepositoryId, setFocusedRepositoryId] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [fetchedProjects, fetchedAnalyses, proof] = await Promise.all([
          api.getProjects(),
          api.getAnalyses(),
          api.getDeploymentProof(),
        ]);
        setProjects((fetchedProjects || []).filter((p) => !SHOWCASE_PROJECT_NAMES.has(p.name)));
        setAnalyses((fetchedAnalyses || []).filter((a) => !SHOWCASE_PROJECT_NAMES.has(a.project?.name)));
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
    const completed = analyses.filter((analysis) => analysis.status === 'complete');
    const avgCompliance = completed.length
      ? completed.reduce((sum, analysis) => sum + Number(analysis.overall_score || 0), 0) / completed.length
      : 0;
    const criticalGaps = analyses
      .flatMap((analysis) => analysis.gaps || [])
      .filter((gap) => gap.priority === 'critical' && gap.status !== 'compliant').length;
    const approvedPackages = analyses.filter((analysis) => analysis.remediation_approval_status === 'approved').length;
    return { avgCompliance, criticalGaps, approvedPackages };
  }, [analyses]);

  const inventory = useMemo(() => projects.map((project) => ({
    id: project.id,
    name: project.name,
    language: project.language || 'Repository',
    description: project.repo_url || 'Registered repository',
    context: project.monitor_enabled ? 'Monitoring' : 'Registered',
  })), [projects]);

  const fieldProjects = inventory.map((item) => ({ id: item.id, status: item.context === 'Monitoring' ? 'complete' : 'pending' }));

  const getStatusBadge = (analysis) => {
    if (analysis.status === 'complete' && analysis.remediation_approval_status === 'approved') {
      return <span className="badge badge-compliant"><UserCheck size={12} /> Approved</span>;
    }
    if (analysis.status === 'complete') return <span className="badge badge-partial"><Shield size={12} /> Review</span>;
    if (analysis.status === 'failed') return <span className="badge badge-non-compliant"><AlertOctagon size={12} /> Failed</span>;
    return <span className="badge badge-pending"><Clock size={12} /> {analysis.status}</span>;
  };

  return (
    <div className="analysis-hub">
      <PageContext
        title="Analysis Hub"
        description="Source-backed repository scans, policy context, and confidence status in one operational workspace."
        actions={(
          <button type="button" className="btn-primary" onClick={() => navigate('/new-analysis')}>
            <Plus size={16} /> New Scan
          </button>
        )}
      />

      {error ? <div className="system-alert system-alert--risk">{error}</div> : null}

      <section className="analysis-hub__stage">
        <OperationalPanel title="Repository Source" meta={projects.length ? 'Registered workspace' : 'Demo workspace'} className="analysis-hub__sources">
          <button type="button" className="source-choice is-active" onClick={() => navigate('/new-analysis')}>
            <span className="source-choice__icon"><GitBranch size={18} /></span>
            <span><strong>Repository scan</strong><small>Configure industry, jurisdiction, and source.</small></span>
            <ArrowUpRight size={16} />
          </button>
          <div className="policy-strip">
            <span>Policy context</span>
            <strong>{INDUSTRIES.length} industry rule packs</strong>
          </div>
          <div className="source-status">
            <Radar size={17} />
            <div><strong>{loading ? 'Loading workspace' : 'Analysis field ready'}</strong><span>{inventory.length} repositories visible</span></div>
          </div>
        </OperationalPanel>

        <div className="analysis-hub__field" aria-label="Repository analysis field">
          <ScanField mode="analysis" projects={fieldProjects} analyses={analyses} focusId={focusedRepositoryId} />
          <div className="analysis-hub__field-label">
            <span>Repository topology</span>
            <strong>{focusedRepositoryId ? 'Focused node' : 'Workspace overview'}</strong>
          </div>
          <div className="analysis-hub__field-count mono">{String(inventory.length).padStart(2, '0')} SOURCES</div>
        </div>
      </section>

      <section className="instrument-strip" aria-label="Analysis statistics">
        {[
          { label: 'Registered codebases', value: projects.length },
          { label: 'Scans run', value: analyses.length },
          { label: 'Average confidence', value: Math.round(stats.avgCompliance), suffix: '%' },
          { label: 'Critical gaps', value: stats.criticalGaps, risk: stats.criticalGaps > 0 },
          { label: 'Approved packages', value: stats.approvedPackages, ok: stats.approvedPackages > 0 },
        ].map(({ label, value, suffix = '', risk, ok }) => (
          <div className="instrument-strip__cell" key={label}>
            <span>{label}</span>
            <CountUp value={value} suffix={suffix} style={{ color: risk ? 'var(--color-risk)' : ok ? 'var(--color-ok)' : 'var(--color-text)' }} />
          </div>
        ))}
      </section>

      <div className="analysis-hub__workspace">
        <OperationalPanel title="Repository Inventory" meta={`${inventory.length} sources`} className="inventory-panel">
          <div className="inventory-table" role="table" aria-label="Repository inventory">
            <div className="inventory-table__head" role="row">
              <span>Repository</span><span>Context</span><span>Source</span>
            </div>
            {inventory.map((item) => (
              <button
                type="button"
                className="inventory-row"
                key={item.id}
                onMouseEnter={() => setFocusedRepositoryId(`project-${item.id}`)}
                onMouseLeave={() => setFocusedRepositoryId(null)}
                onFocus={() => setFocusedRepositoryId(`project-${item.id}`)}
                onBlur={() => setFocusedRepositoryId(null)}
                onClick={() => navigate('/new-analysis')}
              >
                <span className="inventory-row__repository">
                  <i className="mono">{LANG_TAGS[item.language] || 'RE'}</i>
                  <span><strong>{item.name}</strong><small>{item.description}</small></span>
                </span>
                <span>{item.context}</span>
                <span className="mono">{projects.length ? 'LIVE' : 'DEMO'}</span>
              </button>
            ))}
          </div>
        </OperationalPanel>

        <div className="analysis-hub__side">
          <OperationalPanel title="Recent Scans" meta={`${analyses.length} recorded`}>
            <div className="scan-list">
              {loading ? <div className="empty-row scan-sweep">Loading live scans</div> : null}
              {!loading && analyses.length === 0 ? (
                <div className="empty-row">
                  <Shield size={20} />
                  <span>No scans recorded</span>
                  <button type="button" className="text-action" onClick={() => navigate('/new-analysis')}>Start scan <ArrowUpRight size={13} /></button>
                </div>
              ) : null}
              {analyses.slice(0, 5).map((analysis) => (
                <button type="button" className="scan-row" key={analysis.id} onClick={() => navigate(`/report/${analysis.id}`)}>
                  <span><strong>{analysis.project?.name || `Project #${analysis.project_id}`}</strong><small>{analysis.regulation?.name || `Regulation #${analysis.regulation_id}`}</small></span>
                  <span className="scan-row__result"><b>{Math.round(analysis.overall_score || 0)}%</b>{getStatusBadge(analysis)}</span>
                </button>
              ))}
            </div>
          </OperationalPanel>

          <OperationalPanel title="Engine Status" meta="Current deployment">
            <div className="engine-status">
              <Server size={18} />
              <dl>
                <div><dt>Provider</dt><dd>{deploymentProof?.deployment_provider || 'Compliance Autopilot'}</dd></div>
                <div><dt>API key</dt><dd className={deploymentProof?.api_key_configured ? 'is-ok' : 'is-warn'}>{deploymentProof?.api_key_configured ? 'Configured' : 'Not detected'}</dd></div>
                <div><dt>Models</dt><dd className="mono">{(deploymentProof?.models || ['CAP-Analyzer v2', 'CAP-GapDetector v1']).join(', ')}</dd></div>
              </dl>
            </div>
          </OperationalPanel>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
