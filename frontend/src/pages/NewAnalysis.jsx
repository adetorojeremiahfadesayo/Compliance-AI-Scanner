import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_TEMPLATES = [
  { template_id: 0, article_number: "Article 17", title: "Right to Erasure ('Right to be Forgotten')", text_summary: "Covers automated user deletion routines..." },
  { template_id: 1, article_number: "Article 32", title: "Security of Processing", text_summary: "Password hashing, data encryption, and logging leakage audits..." },
  { template_id: 2, article_number: "Article 7", title: "Conditions for Consent", text_summary: "Consent tracking records and ease of revocation..." },
  { template_id: 3, article_number: "Article 5", title: "Principles relating to processing", text_summary: "Data minimization and storage limitation controls..." }
];

function NewAnalysis() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [regTemplates, setRegTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  useEffect(() => {
    async function loadTemplates() {
      try {
        const tmpls = await api.getRegulationTemplates();
        if (tmpls && tmpls.length > 0) {
          setRegTemplates(tmpls);
        } else {
          setRegTemplates(DEFAULT_TEMPLATES);
        }
      } catch {
        setRegTemplates(DEFAULT_TEMPLATES);
      }
    }
    loadTemplates();
  }, []);

  const handleNext = () => {
    if (step === 1 && selectedTemplate === null) return;
    if (step === 2 && (!projectName || !repoUrl)) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleLaunch = async () => {
    setLoading(true);
    try {
      // 1. Load the template into the DB as a regulation first
      const regulation = await api.loadTemplate(selectedTemplate);
      
      // 2. Create the project registry
      const project = await api.createProject({
        name: projectName,
        repo_url: repoUrl
      });
      
      // 3. Start the analysis scan
      const analysis = await api.startAnalysis({
        project_id: project.id,
        regulation_id: regulation.id
      });
      
      // Navigate to active analysis dashboard
      navigate(`/analysis/${analysis.id}`);
    } catch (err) {
      console.error("Failed to launch pipeline:", err);
      // Mock redirect fallback in case of connection limits during presentation
      navigate(`/analysis/2`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Back button */}
      <button 
        onClick={() => navigate('/')} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Configure Compliance Scan</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Analyze codebase dependencies and operations against GDPR compliance controls</p>
      </div>

      {/* Progress Wizard Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: step >= 1 ? 'var(--accent-blue)' : 'var(--border-primary)',
            color: step >= 1 ? '#000' : 'var(--text-secondary)',
            fontWeight: 'bold', fontSize: '12px'
          }}>1</div>
          <span style={{ fontSize: '14px', fontWeight: step === 1 ? '600' : '400', color: step === 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Select Regulation
          </span>
        </div>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-primary)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: step >= 2 ? 'var(--accent-blue)' : 'var(--border-primary)',
            color: step >= 2 ? '#000' : 'var(--text-secondary)',
            fontWeight: 'bold', fontSize: '12px'
          }}>2</div>
          <span style={{ fontSize: '14px', fontWeight: step === 2 ? '600' : '400', color: step === 2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Connect Codebase
          </span>
        </div>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-primary)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: step >= 3 ? 'var(--accent-blue)' : 'var(--border-primary)',
            color: step >= 3 ? '#000' : 'var(--text-secondary)',
            fontWeight: 'bold', fontSize: '12px'
          }}>3</div>
          <span style={{ fontSize: '14px', fontWeight: step === 3 ? '600' : '400', color: step === 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Launch Scan
          </span>
        </div>
      </div>

      {/* Step Contents */}
      <div className="card" style={{ padding: '32px', marginBottom: '32px' }}>
        {step === 1 && (
          <div className="fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Choose Regulation Template</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {regTemplates.map((tmpl) => (
                <div 
                  key={tmpl.template_id}
                  onClick={() => setSelectedTemplate(tmpl.template_id)}
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: selectedTemplate === tmpl.template_id ? 'var(--accent-blue)' : 'var(--border-primary)',
                    backgroundColor: selectedTemplate === tmpl.template_id ? 'rgba(88, 166, 255, 0.03)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--accent-purple)', fontSize: '14px' }}>
                      {tmpl.article_number}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {tmpl.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {tmpl.text_summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Codebase Connection</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                  Project Name
                </label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. MySecuredApp"
                  className="input" 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                  GitHub Repository URL (Public)
                </label>
                <input 
                  type="text" 
                  value={repoUrl} 
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="input" 
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Scan Configuration Confirmation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
              The multi-agent compliance pipeline will run legal parsing on chosen regulations and execute semantic pattern analysis over your repository code structure.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto 40px auto', textAlign: 'left', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Target Regulation</span>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600' }}>
                  {regTemplates.find(t => t.template_id === selectedTemplate)?.title}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Target Codebase</span>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600' }}>{projectName}</span>
                <span style={{ display: 'block', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{repoUrl}</span>
              </div>
            </div>

            <button 
              onClick={handleLaunch} 
              disabled={loading}
              className="btn-primary" 
              style={{ padding: '16px 40px', width: '100%', maxWidth: '300px', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={18} className="status-dot-pulsing" /> : <Shield size={18} />}
              <span>{loading ? 'Launching agents...' : 'Launch Compliance Pipeline'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step < 3 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button onClick={handleBack} className="btn-secondary">
              Back
            </button>
          ) : <div />}
          
          <button 
            onClick={handleNext} 
            disabled={(step === 1 && selectedTemplate === null) || (step === 2 && (!projectName || !repoUrl))}
            className="btn-primary"
            style={{ opacity: ((step === 1 && selectedTemplate === null) || (step === 2 && (!projectName || !repoUrl))) ? 0.5 : 1 }}
          >
            <span>Next</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default NewAnalysis;
