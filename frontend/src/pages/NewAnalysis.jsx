import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowLeft, ArrowRight, Shield, Loader2, Globe, CheckCircle, GitBranch, AlertCircle, Landmark, Ship, Clapperboard, Rocket } from 'lucide-react';
import { INDUSTRIES, CONTINENTS, COUNTRIES_BY_CONTINENT, DEMO_CODEBASES, getRegulations, generateDemoScanResult } from '../data/regulations';
import { api } from '../services/api';
import ScanField from '../components/ScanField';
import PageContext from '../components/PageContext';

const STEPS = ['Industry', 'Geography', 'Codebase', 'Launch'];

const INDUSTRY_ICONS = { banking: Landmark, shipping: Ship, entertainment: Clapperboard };

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/;

// Normalizes a backend rule-pack payload (snake_case) into the camelCase shape the
// wizard renders, so backend and offline-fallback data are interchangeable.
function normalizeRulePack(pack) {
  if (!pack) return null;
  return {
    framework: pack.framework,
    authority: pack.authority,
    sourceUrl: pack.sourceUrl || pack.source_url || null,
    lastUpdated: pack.lastUpdated || pack.last_updated || null,
    requirements: pack.requirements || [],
    isFallback: pack.isFallback || pack.is_fallback || false,
  };
}

function NewAnalysis() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingRegs, setFetchingRegs] = useState(false);
  const [fetchProgress, setFetchProgress] = useState('');

  // Selections
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCodebase, setSelectedCodebase] = useState(null);
  const [regulations, setRegulations] = useState(null);

  // Codebase source: 'demo' (bundled sample) or 'repo' (live scan of a GitHub URL)
  const [scanMode, setScanMode] = useState('demo');
  const [repoUrl, setRepoUrl] = useState('');
  const [launchError, setLaunchError] = useState('');
  const isValidRepoUrl = GITHUB_URL_RE.test(repoUrl.trim());

  // Frameworks for live scans: GDPR baseline, the country rule pack, and/or a
  // pasted custom regulation (parsed into requirements by the Qwen agent).
  const [useGdpr, setUseGdpr] = useState(true);
  const [useRulePack, setUseRulePack] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [customRegName, setCustomRegName] = useState('');
  const [customRegText, setCustomRegText] = useState('');
  const customRegReady = customRegText.trim().length >= 80;
  const frameworkCount = (useGdpr ? 1 : 0) + (useRulePack ? 1 : 0) + (useCustom ? 1 : 0);
  const frameworksReady = frameworkCount > 0 && (!useCustom || customRegReady);
  const spatialSelections = useMemo(() => ({
    industry: selectedIndustry,
    country: selectedCountry,
    codebase: scanMode === 'repo' ? repoUrl.trim() : selectedCodebase,
  }), [selectedIndustry, selectedCountry, selectedCodebase, scanMode, repoUrl]);

  const selectedIndustryData = INDUSTRIES.find(i => i.id === selectedIndustry);
  const selectedCountryData = selectedContinent
    ? COUNTRIES_BY_CONTINENT[selectedContinent]?.find(c => c.id === selectedCountry)
    : null;
  const selectedCodebaseData = DEMO_CODEBASES.find(c => c.id === selectedCodebase);

  // Filter codebases by industry
  const filteredCodebases = DEMO_CODEBASES.filter(cb => !selectedIndustry || cb.industry === selectedIndustry);

  const handleIndustrySelect = (industryId) => {
    const matchingCodebases = DEMO_CODEBASES.filter(cb => cb.industry === industryId);
    setSelectedIndustry(industryId);
    setSelectedCodebase((current) => matchingCodebases.some(cb => cb.id === current) ? current : matchingCodebases[0]?.id || null);
  };

  // Step choreography: slide the step panel in whenever the step changes.
  const stepRef = useRef(null);
  useEffect(() => {
    const el = stepRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.fromTo(el, { opacity: 0, x: 26 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' });
    return () => tween.kill();
  }, [step]);

  const canProceed = () => {
    if (step === 1) return !!selectedIndustry;
    if (step === 2) return !!selectedCountry;
    if (step === 3) return scanMode === 'repo' ? (isValidRepoUrl && frameworksReady) : !!selectedCodebase;
    return true;
  };

  const handleNext = async () => {
    if (!canProceed()) return;
    if (step === 2 && selectedCountry) {
      // Load the source-backed rule pack from the backend; fall back to the
      // bundled copy if the API is unreachable so the wizard still works offline.
      setFetchingRegs(true);
      setFetchProgress('Loading rule pack…');
      let regs;
      try {
        regs = normalizeRulePack(await api.getRulePack(selectedIndustry, selectedCountry));
      } catch {
        regs = normalizeRulePack(getRegulations(selectedIndustry, selectedCountry));
      }
      setRegulations(regs);
      setFetchingRegs(false);
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const repoName = () => {
    const cleaned = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
    return cleaned.split('/').slice(-1)[0] || 'repository';
  };

  const handleLaunch = async () => {
    setLoading(true);
    setLaunchError('');

    if (scanMode === 'repo') {
      // Live scan: seed the selected regulations, register the project, kick off
      // the real Qwen pipeline, then hand off to the analysis view which streams
      // progress. Multiple frameworks run as sequential scans of the same repo.
      try {
        const regulationIds = [];
        if (useGdpr) {
          const reg = await api.loadTemplate(0);
          regulationIds.push(reg.id);
        }
        if (useRulePack) {
          const reg = await api.createRegulationFromRulePack(selectedIndustry, selectedCountry);
          regulationIds.push(reg.id);
        }
        if (useCustom) {
          const reg = await api.createRegulation({
            name: customRegName.trim() || 'Custom Regulation',
            source: 'Custom',
            full_text: customRegText.trim(),
          });
          regulationIds.push(reg.id);
        }

        const project = await api.createProject({ name: repoName(), repo_url: repoUrl.trim() });
        if (regulationIds.length > 1) {
          const analyses = await api.startMultiAnalysis(project.id, regulationIds);
          navigate(`/analysis/${analyses[0].id}`);
        } else {
          const analysis = await api.startAnalysis({ project_id: project.id, regulation_id: regulationIds[0] });
          navigate(`/analysis/${analysis.id}`);
        }
      } catch (err) {
        console.error('Live scan failed to start:', err);
        setLaunchError('Could not start the live scan. Check that the backend is running and the repository URL is a public GitHub repo.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Demo scan: prefer the durable backend seed; fall back to an offline demo.
    try {
      const backendResult = await api.createDemoAnalysisForCodebase(selectedCodebase, selectedCountry);
      navigate(`/analysis/${backendResult.id}`);
    } catch (err) {
      console.error('Backend demo seed failed, using offline demo:', err);
      await new Promise(r => setTimeout(r, 800));
      const result = generateDemoScanResult(selectedCodebase, selectedIndustry, selectedCountry);
      sessionStorage.setItem('demoResult', JSON.stringify({
        ...result,
        offlineDemo: true,
        industryLabel: selectedIndustryData?.label,
        countryLabel: selectedCountryData?.label,
        countryFlag: selectedCountryData?.flag,
        continent: selectedContinent,
      }));
      navigate(`/analysis/demo-${selectedCodebase}-${selectedCountry}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="configuration-hub">
      <PageContext
        title="Configuration Hub"
        description="Set the industry, jurisdiction, repository source, and rule context for this scan."
        backAction={{ label: 'Back to Dashboard', onClick: () => navigate('/') }}
        status={<span className="configuration-hub__step-status mono">STEP {String(step).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>}
      />

      <div className="configuration-hub__layout">
        <aside className="configuration-steps" aria-label="Scan configuration progress">
          <div className="configuration-steps__heading">
            <span>Scan setup</span>
            <strong>{STEPS[step - 1]}</strong>
          </div>
          <div className="configuration-steps__list">
        {STEPS.map((label, idx) => {
          const num = idx + 1;
          const isDone = step > num;
          const isActive = step === num;
          return (
            <div key={label} className={`configuration-step${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`} aria-current={isActive ? 'step' : undefined}>
              <span className="configuration-step__number mono">{isDone ? <CheckCircle size={13} /> : String(num).padStart(2, '0')}</span>
              <span>{label}</span>
            </div>
          );
        })}
          </div>
        </aside>

        <section className="configuration-workspace">
          {/* Step Content */}
          <div ref={stepRef} className="configuration-panel">
        {/* STEP 1: Industry */}
        {step === 1 && (
          <div className="fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Select Your Industry</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Each industry has distinct regulatory requirements. Choose the sector that matches your software.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {INDUSTRIES.map(ind => {
                const Icon = INDUSTRY_ICONS[ind.id] || Shield;
                const isSel = selectedIndustry === ind.id;
                return (
                  <button
                    type="button"
                    key={ind.id}
                    onClick={() => handleIndustrySelect(ind.id)}
                    className={`select-card${isSel ? ' selected' : ''}`}
                    style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '18px' }}
                  >
                    <div style={{
                      width: '48px', height: '48px', display: 'flex', flexShrink: 0,
                      alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)', background: 'var(--bg-card)',
                      color: isSel ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'color var(--transition-fast)',
                    }}>
                      <Icon size={20} strokeWidth={1.7} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15.5px', fontWeight: '680', marginBottom: '4px' }}>{ind.label}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{ind.description}</div>
                    </div>
                    {isSel && <CheckCircle size={18} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Geography */}
        {step === 2 && (
          <div className="fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Select Target Geography</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Compliance rules are country-specific. We'll load a source-backed rule pack for your chosen market.
            </p>

            {/* Continent selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                Continent
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {CONTINENTS.map(cont => (
                  <button
                    key={cont.id}
                    onClick={() => { setSelectedContinent(cont.id); setSelectedCountry(null); }}
                    style={{
                      padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selectedContinent === cont.id ? 'var(--accent-blue)' : 'var(--border-primary)',
                      background: selectedContinent === cont.id ? 'rgba(var(--accent-rgb),0.1)' : 'rgba(255,255,255,0.02)',
                      color: selectedContinent === cont.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontSize: '13px', fontWeight: selectedContinent === cont.id ? '700' : '400',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{cont.flag}</span> {cont.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Country selector */}
            {selectedContinent && (
              <div className="fade-in">
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Country
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
                  {COUNTRIES_BY_CONTINENT[selectedContinent]?.map(country => (
                    <button
                      key={country.id}
                      onClick={() => setSelectedCountry(country.id)}
                      style={{
                        padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                        border: '1px solid',
                        borderColor: selectedCountry === country.id ? 'var(--accent-blue)' : 'var(--border-primary)',
                        background: selectedCountry === country.id ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(255,255,255,0.02)',
                        color: selectedCountry === country.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '14px', fontWeight: selectedCountry === country.id ? '600' : '400',
                        display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                        transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease', width: '100%',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{country.flag}</span>
                      <span>{country.label}</span>
                      {selectedCountry === country.id && <CheckCircle size={14} color="var(--accent-blue)" style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fetching regulations overlay */}
            {fetchingRegs && (
              <div style={{
                marginTop: '24px', padding: '20px 24px',
                background: 'rgba(var(--accent-rgb),0.05)', border: '1px solid rgba(var(--accent-rgb),0.2)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                <Loader2 size={18} color="var(--accent-blue)" className="status-dot-pulsing" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-blue)', marginBottom: '2px' }}>Fetching Regulations</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fetchProgress}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Codebase */}
        {step === 3 && (
          <div className="fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Choose What to Scan</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Scan a bundled demo codebase, or run a live scan of your own public GitHub repository.
            </p>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'demo', label: 'Demo codebase', icon: <Shield size={15} /> },
                { id: 'repo', label: 'My repository', icon: <GitBranch size={15} /> },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => { setScanMode(m.id); setLaunchError(''); }}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid',
                    borderColor: scanMode === m.id ? 'var(--accent-blue)' : 'var(--border-primary)',
                    background: scanMode === m.id ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(255,255,255,0.02)',
                    color: scanMode === m.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: '14px', fontWeight: scanMode === m.id ? '700' : '500',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease',
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {regulations && (
              <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'rgba(var(--accent-rgb),0.05)', border: '1px solid rgba(var(--accent-rgb),0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Globe size={16} color="var(--accent-blue)" />
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loaded regulations: </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-blue)' }}>{regulations.framework}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> · {regulations.authority}</span>
                  {regulations.lastUpdated && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> · Updated {regulations.lastUpdated}</span>}
                  {regulations.sourceUrl && (
                    <a href={regulations.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent-blue)', marginLeft: '8px' }}>
                      Source
                    </a>
                  )}
                </div>
              </div>
            )}

            {scanMode === 'demo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredCodebases.map(cb => {
                const ind = INDUSTRIES.find(i => i.id === cb.industry);
                const score = selectedCountry ? (cb.scoreByCountry?.[selectedCountry] ?? 45) : null;
                const isPassing = score !== null && score >= 60;
                return (
                  <button
                    type="button"
                    key={cb.id}
                    onClick={() => setSelectedCodebase(cb.id)}
                    className={`select-card${selectedCodebase === cb.id ? ' selected' : ''}`}
                    style={{ padding: '20px 24px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15.5px', fontWeight: '680' }}>{cb.name}</span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: '999px', padding: '2px 9px' }}>
                            {ind?.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>{cb.description}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {cb.violations.slice(0, 3).map((v, i) => (
                            <span key={i} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '999px', background: 'rgba(var(--risk-rgb),0.08)', border: '1px solid rgba(var(--risk-rgb),0.22)', color: 'var(--status-non-compliant)' }}>
                              {v.length > 38 ? v.slice(0, 38) + '…' : v}
                            </span>
                          ))}
                          {cb.violations.length > 3 && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '3px 8px' }}>+{cb.violations.length - 3} more</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        {score !== null && (
                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '22px', fontWeight: '500', color: isPassing ? 'var(--status-compliant)' : 'var(--status-non-compliant)', lineHeight: 1 }}>{score}%</div>
                            <div className="label" style={{ marginTop: '4px' }}>est. score</div>
                          </div>
                        )}
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{cb.language}</div>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{cb.linesOfCode} lines</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            )}

            {scanMode === 'repo' && (
              <div className="fade-in">
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Public GitHub Repository URL
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 14px', borderRadius: '10px', border: '1px solid', borderColor: repoUrl && !isValidRepoUrl ? 'var(--status-non-compliant)' : 'var(--border-primary)', background: 'rgba(255,255,255,0.02)' }}>
                  <GitBranch size={18} color="var(--text-secondary)" />
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={e => { setRepoUrl(e.target.value); setLaunchError(''); }}
                    placeholder="https://github.com/owner/repository"
                    style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'monospace' }}
                  />
                  {isValidRepoUrl && <CheckCircle size={16} color="var(--status-compliant)" />}
                </div>
                {repoUrl && !isValidRepoUrl && (
                  <p style={{ fontSize: '12px', color: 'var(--status-non-compliant)', marginTop: '8px' }}>
                    Enter a valid public GitHub URL, e.g. https://github.com/owner/repository
                  </p>
                )}
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '14px', lineHeight: '1.6' }}>
                  The live pipeline clones the repository and runs the full Qwen agent
                  chain: regulation parsing, codebase analysis, gap detection, and
                  remediation, streaming progress as it goes. Use a small public repo
                  for the fastest scan.
                </p>

                {/* Framework selection */}
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', margin: '24px 0 10px' }}>
                  Frameworks to Scan Against
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { id: 'gdpr', checked: useGdpr, toggle: () => setUseGdpr(v => !v), label: 'GDPR baseline', detail: 'Article 5: principles for processing personal data' },
                    { id: 'pack', checked: useRulePack, toggle: () => setUseRulePack(v => !v), label: regulations?.framework || 'Country rule pack', detail: `${regulations?.authority || 'Regulatory authority'} · ${selectedCountryData?.label || 'selected country'}` },
                    { id: 'custom', checked: useCustom, toggle: () => setUseCustom(v => !v), label: 'Custom regulation', detail: 'Paste any regulation or internal policy. The agent parses it into requirements' },
                  ].map(fw => (
                    <button
                      type="button"
                      key={fw.id}
                      onClick={fw.toggle}
                      style={{
                        padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                        border: '1px solid', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', color: 'inherit',
                        borderColor: fw.checked ? 'var(--accent-blue)' : 'var(--border-primary)',
                        background: fw.checked ? 'rgba(var(--accent-rgb),0.06)' : 'rgba(255,255,255,0.02)',
                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                        border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderColor: fw.checked ? 'var(--accent)' : 'var(--border-strong)',
                        background: fw.checked ? 'var(--accent)' : 'transparent',
                        transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                      }}>
                        {fw.checked && <CheckCircle size={12} color="var(--accent-ink)" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: fw.checked ? '600' : '500', color: fw.checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{fw.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{fw.detail}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {useCustom && (
                  <div className="fade-in" style={{ marginTop: '14px' }}>
                    <input
                      type="text"
                      value={customRegName}
                      onChange={e => setCustomRegName(e.target.value)}
                      placeholder="Regulation name (e.g. Internal Data Handling Policy v3)"
                      style={{ width: '100%', padding: '12px 14px', marginBottom: '10px', borderRadius: '10px', border: '1px solid var(--border-primary)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    />
                    <textarea
                      value={customRegText}
                      onChange={e => setCustomRegText(e.target.value)}
                      placeholder="Paste the regulation or policy text here (at least a few sentences). The RegulationParser agent extracts structured technical requirements from it with qwen3.7-max."
                      rows={6}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid', borderColor: customRegText && !customRegReady ? 'var(--status-partial)' : 'var(--border-primary)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
                    />
                    {customRegText && !customRegReady && (
                      <p style={{ fontSize: '12px', color: 'var(--status-partial)', marginTop: '6px' }}>
                        Add a bit more text ({customRegText.trim().length}/80 characters) so the parser has enough to work with.
                      </p>
                    )}
                  </div>
                )}

                {!frameworksReady && frameworkCount === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--status-non-compliant)', marginTop: '10px' }}>
                    Select at least one framework to scan against.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Launch */}
        {step === 4 && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', border: '1px solid rgba(var(--accent-rgb),0.35)', background: 'rgba(var(--accent-rgb),0.07)', marginBottom: '18px' }}>
                <Rocket size={26} color="var(--accent)" strokeWidth={1.6} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '760', marginBottom: '10px' }}>Ready to Launch</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', maxWidth: '480px', margin: '0 auto' }}>
                The compliance engine will analyse your codebase against <strong style={{ color: 'var(--text-primary)' }}>{regulations?.requirements?.length || 0} requirements</strong> from a source-backed <strong style={{ color: 'var(--text-primary)' }}>{regulations?.authority || 'regulatory authority'}</strong> rule pack.
              </p>
            </div>

            {/* Config Summary */}
            <div style={{ maxWidth: '420px', margin: '0 auto 36px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
              {[
                { label: 'Industry', value: selectedIndustryData?.label },
                { label: 'Country', value: `${selectedCountryData?.flag} ${selectedCountryData?.label}` },
                { label: 'Framework', value: regulations?.framework || '-' },
                { label: 'Authority', value: regulations?.authority || '-' },
                { label: 'Source Updated', value: regulations?.lastUpdated || '-' },
                ...(scanMode === 'repo'
                  ? [
                      { label: 'Repository', value: <span className="mono" style={{ fontSize: '12px' }}>{repoName()}</span> },
                      { label: 'Frameworks', value: `${frameworkCount} selected${frameworkCount > 1 ? ' (multi-scan)' : ''}` },
                      { label: 'Mode', value: <span className="mono" style={{ fontSize: '12px', color: 'var(--accent)' }}>LIVE SCAN</span> },
                    ]
                  : [{ label: 'Codebase', value: selectedCodebaseData?.name }, { label: 'Language', value: <span className="mono" style={{ fontSize: '12px' }}>{selectedCodebaseData?.language}</span> }]),
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-primary)' : 'none', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {launchError && (
              <div style={{ maxWidth: '480px', margin: '0 auto 24px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(var(--risk-rgb),0.08)', border: '1px solid rgba(var(--risk-rgb),0.3)', display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left' }}>
                <AlertCircle size={16} color="var(--status-non-compliant)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '13px', color: 'var(--status-non-compliant)' }}>{launchError}</span>
              </div>
            )}

            <button
              onClick={handleLaunch}
              disabled={loading}
              className="btn-primary"
              style={{ padding: '16px 48px', fontSize: '15px', justifyContent: 'center', minWidth: '260px' }}
            >
              {loading ? (
                <><Loader2 size={18} className="status-dot-pulsing" /> {scanMode === 'repo' ? 'Starting live scan…' : 'Analysing codebase...'}</>
              ) : (
                <><Shield size={18} /> {scanMode === 'repo' ? 'Launch Live Scan' : 'Launch Compliance Scan'}</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="configuration-command">
        {step < 4 ? (
        <>
          {step > 1 ? (
            <button onClick={handleBack} className="btn-secondary">
              <ArrowLeft size={16} /> Back
            </button>
          ) : <span />}
          <button
            onClick={handleNext}
            disabled={!canProceed() || fetchingRegs}
            className="btn-primary"
            style={{ opacity: (!canProceed() || fetchingRegs) ? 0.5 : 1 }}
          >
            {fetchingRegs ? <><Loader2 size={16} className="status-dot-pulsing" /> Fetching...</> : <><span>Next</span><ArrowRight size={16} /></>}
          </button>
        </>
        ) : (
          <button onClick={handleBack} className="btn-secondary" disabled={loading}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
      </div>
        </section>

        <aside className="configuration-field" aria-label="Configuration lattice">
          <ScanField mode="configuration" selections={spatialSelections} />
          <div className="configuration-field__label">
            <span>Configuration lattice</span>
            <strong>{selectedCountryData?.label || selectedIndustryData?.label || 'Awaiting selection'}</strong>
          </div>
          <dl className="configuration-field__context">
            <div><dt>Industry</dt><dd>{selectedIndustryData?.label || '-'}</dd></div>
            <div><dt>Jurisdiction</dt><dd>{selectedCountryData?.label || '-'}</dd></div>
            <div><dt>Source</dt><dd>{scanMode === 'repo' ? (repoName() || '-') : (selectedCodebaseData?.name || '-')}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

export default NewAnalysis;
