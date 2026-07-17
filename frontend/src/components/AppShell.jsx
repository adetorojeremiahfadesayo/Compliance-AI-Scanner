import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { gsap } from 'gsap';
import Sidebar from './Sidebar';
import { getRouteContext } from '../utils/appShellModel';

function AppShell({ children }) {
  const location = useLocation();
  const stageRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const context = getRouteContext(location.pathname);

  useEffect(() => {
    if (!stageRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const animation = gsap.fromTo(
      stageRef.current,
      { opacity: 0, y: 12, scale: 0.997 },
      { opacity: 1, y: 0, scale: 1, duration: 0.52, ease: 'power3.out', clearProps: 'transform' },
    );
    return () => animation.kill();
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen ? <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <div className="app-shell__workspace">
        <header className="command-band">
          <button
            type="button"
            className="icon-button command-band__menu"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="command-band__context">
            <span>{context.section}</span>
            <i aria-hidden="true" />
            <strong>{context.page}</strong>
          </div>
          <div className="command-band__status" aria-label="System status operational">
            <Activity size={14} />
            <span>Operational</span>
          </div>
        </header>

        <main className="route-stage">
          <div ref={stageRef} className="route-stage__content" key={location.pathname}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
