import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

function ComplianceGauge({ score = 0, size = 160 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const numberRef = useRef(null);

  useEffect(() => {
    // Arc draw-on
    const timer = setTimeout(() => setAnimatedScore(score), 100);

    // Number count-up, written straight to the DOM
    const el = numberRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tween;
    if (el) {
      if (reduce) {
        el.textContent = `${Math.round(score)}%`;
      } else {
        const state = { v: 0 };
        tween = gsap.to(state, {
          v: score,
          duration: 1.2,
          ease: 'power3.out',
          onUpdate: () => { el.textContent = `${Math.round(state.v)}%`; },
        });
      }
    }
    return () => { clearTimeout(timer); if (tween) tween.kill(); };
  }, [score]);

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  let strokeColor = 'var(--status-non-compliant)';
  if (score >= 80) strokeColor = 'var(--status-compliant)';
  else if (score >= 50) strokeColor = 'var(--status-partial)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--border-primary)"
            strokeWidth={strokeWidth}
          />
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
            style={{ transition: 'stroke-dashoffset 1.2s var(--ease-out)' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}>
          <span ref={numberRef} className="mono" style={{ fontSize: '30px', fontWeight: '500', color: 'var(--text-primary)' }}>
            0%
          </span>
        </div>
      </div>
      <span className="label" style={{ marginTop: '14px' }}>
        Compliance Score
      </span>
    </div>
  );
}

export default ComplianceGauge;
