import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Animates a number from 0 to `value` via GSAP, writing straight to the DOM
 * node (no React re-renders per frame). Instant under reduced motion.
 */
function CountUp({ value = 0, suffix = '', duration = 1.1, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Number(value) || 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.textContent = `${Math.round(target)}${suffix}`;
      return;
    }
    const state = { v: 0 };
    const tween = gsap.to(state, {
      v: target,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = `${Math.round(state.v)}${suffix}`;
      },
    });
    return () => tween.kill();
  }, [value, suffix, duration]);

  return <span ref={ref} className="mono" style={style}>{`0${suffix}`}</span>;
}

export default CountUp;
