import { useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight, Shield } from 'lucide-react';

function ComplianceReportModal({ result, industry, country, countryFlag, onClose, onViewReport }) {
  const overlayRef = useRef(null);
  const score = result?.overall_score ?? 0;
  const isPassing = score >= 60;

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const criticalGaps = (result?.gaps || []).filter(g => g.priority === 'critical' && g.status !== 'compliant');
  const topGaps = criticalGaps.slice(0, 3);

  const verdictColor = isPassing ? '#3FB950' : '#F85149';
  const verdictBg = isPassing ? 'rgba(63, 185, 80, 0.08)' : 'rgba(248, 81, 73, 0.08)';
  const verdictBorder = isPassing ? 'rgba(63, 185, 80, 0.25)' : 'rgba(248, 81, 73, 0.25)';

  const recommendations = isPassing ? [
    'Schedule quarterly re-scans to catch regressions',
    'Add automated compliance checks to your CI/CD pipeline',
    'Document your data processing activities for auditor access',
    'Conduct annual penetration testing against identified controls',
  ] : [
    'Resolve all critical gaps before deployment to production',
    'Engage a certified DPO (Data Protection Officer) for review',
    'Implement a structured remediation roadmap within 30 days',
    'Re-scan after each major fix to track compliance progress',
  ];

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 8, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
        animation: 'fadeIn 0.2s ease forwards',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #0D1117, #161B22)',
          border: `1px solid ${verdictBorder}`,
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px ${verdictBorder}, 0 0 60px ${isPassing ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)'}`,
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
            transition: 'all 0.15s ease', zIndex: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <X size={16} />
        </button>

        {/* Header Verdict Banner */}
        <div style={{
          background: verdictBg,
          borderBottom: `1px solid ${verdictBorder}`,
          padding: '32px 40px 28px',
          borderRadius: '20px 20px 0 0',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
            {isPassing
              ? <CheckCircle size={28} color={verdictColor} />
              : <AlertTriangle size={28} color={verdictColor} />
            }
            <span style={{ fontSize: '13px', fontWeight: '700', color: verdictColor, letterSpacing: '2px', textTransform: 'uppercase' }}>
              {isPassing ? 'Compliance Passing' : 'Non-Compliant'}
            </span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Confidence Score Report
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {countryFlag} {country} · {industry} · {result?.regulation?.name || result?.framework || 'Compliance Framework'}
          </p>
        </div>

        {/* Score Section */}
        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            {/* Big Score */}
            <div style={{ textAlign: 'center', minWidth: '140px' }}>
              <ScoreRing score={score} isPassing={isPassing} />
            </div>

            {/* Score Breakdown */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Compliance Score</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: verdictColor }}>{Math.round(score)}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '999px',
                    width: `${score}%`,
                    background: isPassing
                      ? 'linear-gradient(90deg, #3FB950, #56D364)'
                      : 'linear-gradient(90deg, #F85149, #FF7B72)',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <StatChip label="Total Gaps" value={result?.totalGaps ?? (result?.gaps?.length || 0)} color="var(--text-secondary)" />
                <StatChip label="Critical" value={result?.criticalGaps ?? criticalGaps.length} color="#F85149" />
                <StatChip label="Threshold" value="60%" color={isPassing ? '#3FB950' : '#F85149'} />
              </div>

              {/* Threshold bar */}
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {isPassing
                  ? <><TrendingUp size={14} color="#3FB950" /> <span style={{ color: '#3FB950' }}>{Math.round(score - 60)}% above</span> the 60% passing threshold</>
                  : <><TrendingDown size={14} color="#F85149" /> <span style={{ color: '#F85149' }}>{Math.round(60 - score)}% below</span> the 60% passing threshold — action required</>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Critical Gaps */}
        {topGaps.length > 0 && (
          <div style={{ padding: '28px 40px', borderBottom: '1px solid var(--border-primary)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Top Critical Violations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topGaps.map((gap, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '14px 16px',
                  background: 'rgba(248, 81, 73, 0.05)',
                  border: '1px solid rgba(248, 81, 73, 0.15)',
                  borderRadius: '10px',
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(248, 81, 73, 0.15)', border: '1px solid rgba(248, 81, 73, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700', color: '#F85149', marginTop: '1px',
                  }}>{idx + 1}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>
                      {gap.requirement?.title || 'Compliance Violation'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {gap.gap_description}
                    </div>
                    <div style={{ fontSize: '11px', color: '#F85149', marginTop: '4px', fontFamily: 'monospace' }}>
                      {gap.requirement?.article_reference} · {gap.code_location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div style={{ padding: '28px 40px', borderBottom: '1px solid var(--border-primary)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {isPassing ? 'Recommendations to Maintain Compliance' : 'Recommended Next Steps'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: '1.5' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                  background: isPassing ? 'rgba(63, 185, 80, 0.12)' : 'rgba(88, 166, 255, 0.12)',
                  border: `1px solid ${isPassing ? 'rgba(63,185,80,0.3)' : 'rgba(88,166,255,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: '700',
                  color: isPassing ? '#3FB950' : 'var(--accent-blue)', marginTop: '1px',
                }}>{idx + 1}</div>
                <span style={{ color: 'var(--text-secondary)' }}>{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '24px 40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border-primary)',
              borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Dismiss
          </button>
          <button
            onClick={onViewReport}
            style={{
              background: 'var(--gradient-primary)', border: 'none',
              borderRadius: '10px', padding: '12px 28px', cursor: 'pointer',
              color: '#000', fontSize: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(88,166,255,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Shield size={16} />
            View Full Report
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score, isPassing }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = isPassing ? '#3FB950' : '#F85149';

  return (
    <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto' }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '28px', fontWeight: '900', color, letterSpacing: '-1px' }}>{Math.round(score)}%</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>score</span>
      </div>
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px', padding: '10px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '18px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

export default ComplianceReportModal;
