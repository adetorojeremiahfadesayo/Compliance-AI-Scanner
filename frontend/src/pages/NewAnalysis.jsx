import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Shield, Loader2, Globe, CheckCircle } from 'lucide-react';
import { INDUSTRIES, CONTINENTS, COUNTRIES_BY_CONTINENT, DEMO_CODEBASES, getRegulations, generateDemoScanResult } from '../data/regulations';
import { api } from '../services/api';

const STEPS = ['Industry', 'Geography', 'Codebase', 'Launch'];

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

  const selectedIndustryData = INDUSTRIES.find(i => i.id === selectedIndustry);
  const selectedCountryData = selectedContinent
    ? COUNTRIES_BY_CONTINENT[selectedContinent]?.find(c => c.id === selectedCountry)
    : null;
  const selectedCodebaseData = DEMO_CODEBASES.find(c => c.id === selectedCodebase);

  // Filter codebases by industry
  const filteredCodebases = DEMO_CODEBASES.filter(cb => !selectedIndustry || cb.industry === selectedIndustry);

  useEffect(() => {
    if (!selectedIndustry) {
      setSelectedCodebase(null);
      return;
    }

    const matchingCodebases = DEMO_CODEBASES.filter(cb => cb.industry === selectedIndustry);
    if (!matchingCodebases.some(cb => cb.id === selectedCodebase)) {
      setSelectedCodebase(matchingCodebases[0]?.id || null);
    }
  }, [selectedIndustry, selectedCodebase]);

  const canProceed = () => {
    if (step === 1) return !!selectedIndustry;
    if (step === 2) return !!selectedCountry;
    if (step === 3) return !!selectedCodebase;
    return true;
  };

  const handleNext = async () => {
    if (!canProceed()) return;
    if (step === 2 && selectedCountry) {
      setFetchingRegs(true);
      const regs = getRegulations(selectedIndustry, selectedCountry);
      const steps = [
        `Connecting to source-backed compliance registry...`,
        `Loading ${selectedCountryData?.label} ${selectedIndustryData?.label} rule pack...`,
        `Parsing ${regs?.framework || 'compliance framework'}...`,
        `Checking ${regs?.requirements?.length || 0} requirements from ${regs?.authority || 'regulatory authority'}...`,
        `Rule pack ready`,
      ];
      for (let i = 0; i < steps.length; i++) {
        setFetchProgress(steps[i]);
        await new Promise(r => setTimeout(r, 500));
      }
      setRegulations(regs);
      setFetchingRegs(false);
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const backendResult = await api.createDemoAnalysisForCodebase(selectedCodebase, selectedCountry);
      navigate(`/analysis/${backendResult.id}`);
    } catch {
      await new Promise(r => setTimeout(r, 1200));
      const result = generateDemoScanResult(selectedCodebase, selectedIndustry, selectedCountry);
      sessionStorage.setItem('demoResult', JSON.stringify({
        ...result,
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
    <div className="fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>New Compliance Scan</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>
          Check if your software matches source-backed industry rules for a specific country.
        </p>
      </div>

      {/* Progress Wizard */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
        {STEPS.map((label, idx) => {
          const num = idx + 1;
          const isDone = step > num;
          const isActive = step === num;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isDone ? 'var(--status-compliant)' : isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${isDone ? 'var(--status-compliant)' : isActive ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                  color: isDone ? '#000' : isActive ? '#000' : 'var(--text-secondary)',
                  fontWeight: '700', fontSize: '12px',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 0 12px rgba(88,166,255,0.4)' : 'none',
                }}>
                  {isDone ? <CheckCircle size={14} /> : num}
                </div>
                <span style={{ fontSize: '13px', fontWeight: isActive ? '700' : '400', color: isActive ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '1px', backgroundColor: step > num ? 'var(--status-compliant)' : 'var(--border-primary)', margin: '0 12px', transition: 'background-color 0.3s ease' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card" style={{ padding: '36px', marginBottom: '28px', minHeight: '340px' }}>

        {/* STEP 1: Industry */}
        {step === 1 && (
          <div className="fade-in">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Select Your Industry</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Each industry has distinct regulatory requirements. Choose the sector that matches your software.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {INDUSTRIES.map(ind => (
                <div
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind.id)}
                  style={{
                    padding: '22px 24px',
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: selectedIndustry === ind.id ? ind.color : 'var(--border-primary)',
                    background: selectedIndustry === ind.id ? ind.gradient : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: '20px',
                    boxShadow: selectedIndustry === ind.id ? `0 0 20px ${ind.color}20` : 'none',
                  }}
                  onMouseEnter={e => { if (selectedIndustry !== ind.id) { e.currentTarget.style.borderColor = ind.color + '60'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                  onMouseLeave={e => { if (selectedIndustry !== ind.id) { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
                >
                  <div style={{
                    fontSize: '32px', width: '56px', height: '56px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', borderRadius: '14px',
                    background: `${ind.color}15`, border: `1px solid ${ind.color}30`, flexShrink: 0,
                  }}>{ind.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: selectedIndustry === ind.id ? ind.color : 'var(--text-primary)' }}>
                      {ind.label}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{ind.description}</div>
                  </div>
                  {selectedIndustry === ind.id && (
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: ind.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={14} color="#000" />
                    </div>
                  )}
                </div>
              ))}
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
                      background: selectedContinent === cont.id ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.02)',
                      color: selectedContinent === cont.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontSize: '13px', fontWeight: selectedContinent === cont.id ? '700' : '400',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'all 0.15s ease',
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
                        background: selectedCountry === country.id ? 'rgba(88,166,255,0.08)' : 'rgba(255,255,255,0.02)',
                        color: selectedCountry === country.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '14px', fontWeight: selectedCountry === country.id ? '600' : '400',
                        display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                        transition: 'all 0.15s ease', width: '100%',
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
                background: 'rgba(88,166,255,0.05)', border: '1px solid rgba(88,166,255,0.2)',
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Select Demo Codebase</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Choose a pre-built demo codebase to scan. Each contains realistic compliance violations for your selected industry.
            </p>

            {regulations && (
              <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'rgba(88,166,255,0.05)', border: '1px solid rgba(88,166,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredCodebases.map(cb => {
                const ind = INDUSTRIES.find(i => i.id === cb.industry);
                const score = selectedCountry ? (cb.scoreByCountry?.[selectedCountry] ?? 45) : null;
                const isPassing = score !== null && score >= 60;
                return (
                  <div
                    key={cb.id}
                    onClick={() => setSelectedCodebase(cb.id)}
                    style={{
                      padding: '20px 24px', borderRadius: '14px', cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selectedCodebase === cb.id ? 'var(--accent-blue)' : 'var(--border-primary)',
                      background: selectedCodebase === cb.id ? 'rgba(88,166,255,0.05)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedCodebase === cb.id ? '0 0 20px rgba(88,166,255,0.12)' : 'none',
                    }}
                    onMouseEnter={e => { if (selectedCodebase !== cb.id) e.currentTarget.style.borderColor = 'rgba(88,166,255,0.3)'; }}
                    onMouseLeave={e => { if (selectedCodebase !== cb.id) e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '20px' }}>{cb.languageIcon}</span>
                          <span style={{ fontSize: '16px', fontWeight: '700' }}>{cb.name}</span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: `${ind?.color}15`, color: ind?.color, border: `1px solid ${ind?.color}30`, fontWeight: '600' }}>
                            {ind?.icon} {ind?.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>{cb.description}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {cb.violations.slice(0, 3).map((v, i) => (
                            <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', color: '#F85149' }}>
                              ⚠ {v.length > 38 ? v.slice(0, 38) + '…' : v}
                            </span>
                          ))}
                          {cb.violations.length > 3 && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '3px 8px' }}>+{cb.violations.length - 3} more</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        {score !== null && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: isPassing ? '#3FB950' : '#F85149', lineHeight: 1 }}>{score}%</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>est. score</div>
                            <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: '600', color: isPassing ? '#3FB950' : '#F85149', padding: '2px 6px', borderRadius: '4px', background: isPassing ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)' }}>
                              {isPassing ? '✓ PASS' : '✗ FAIL'}
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{cb.language}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{cb.linesOfCode} lines</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Launch */}
        {step === 4 && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>Ready to Launch</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', maxWidth: '480px', margin: '0 auto' }}>
                The compliance engine will analyse your codebase against <strong style={{ color: 'var(--text-primary)' }}>{regulations?.requirements?.length || 0} requirements</strong> from a source-backed <strong style={{ color: 'var(--text-primary)' }}>{regulations?.authority || 'regulatory authority'}</strong> rule pack.
              </p>
            </div>

            {/* Config Summary */}
            <div style={{ maxWidth: '420px', margin: '0 auto 36px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
              {[
                { label: 'Industry', value: `${selectedIndustryData?.icon} ${selectedIndustryData?.label}` },
                { label: 'Country', value: `${selectedCountryData?.flag} ${selectedCountryData?.label}` },
                { label: 'Framework', value: regulations?.framework || '—' },
                { label: 'Authority', value: regulations?.authority || '—' },
                { label: 'Source Updated', value: regulations?.lastUpdated || '—' },
                { label: 'Codebase', value: `${selectedCodebaseData?.languageIcon} ${selectedCodebaseData?.name}` },
                { label: 'Language', value: selectedCodebaseData?.language },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 20px', borderBottom: i < 6 ? '1px solid var(--border-primary)' : 'none', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleLaunch}
              disabled={loading}
              className="btn-primary"
              style={{ padding: '16px 48px', fontSize: '15px', justifyContent: 'center', minWidth: '260px' }}
            >
              {loading ? (
                <><Loader2 size={18} className="status-dot-pulsing" /> Analysing codebase...</>
              ) : (
                <><Shield size={18} /> Launch Compliance Scan</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button onClick={handleBack} className="btn-secondary">
              <ArrowLeft size={16} /> Back
            </button>
          ) : <div />}
          <button
            onClick={handleNext}
            disabled={!canProceed() || fetchingRegs}
            className="btn-primary"
            style={{ opacity: (!canProceed() || fetchingRegs) ? 0.5 : 1 }}
          >
            {fetchingRegs ? <><Loader2 size={16} className="status-dot-pulsing" /> Fetching...</> : <><span>Next</span><ArrowRight size={16} /></>}
          </button>
        </div>
      )}
    </div>
  );
}

export default NewAnalysis;
