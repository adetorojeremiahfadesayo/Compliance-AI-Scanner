import { useEffect, useState } from 'react';

function ComplianceGauge({ score = 0, size = 160 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    // Basic slide/fill animation on mount
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Determine color based on score
  let strokeColor = 'var(--status-non-compliant)';
  if (score >= 80) {
    strokeColor = 'var(--status-compliant)';
  } else if (score >= 50) {
    strokeColor = 'var(--status-partial)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--bg-secondary)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* Score Text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}>
          <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {Math.round(animatedScore)}%
          </span>
        </div>
      </div>
      <span style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
        Compliance Score
      </span>
    </div>
  );
}

export default ComplianceGauge;
