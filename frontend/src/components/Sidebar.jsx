import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Plus, ShieldCheck } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/new-analysis', label: 'New Scan', icon: Plus },
];

function Sidebar({ mobileOpen = false, onClose }) {
  return (
    <aside className={`navigation-rail${mobileOpen ? ' is-open' : ''}`} aria-label="Primary navigation">
      <div className="navigation-rail__brand">
        <span className="navigation-rail__mark"><ShieldCheck size={20} /></span>
        <div>
          <strong>Compliance</strong>
          <span>Autopilot</span>
        </div>
      </div>

      <nav className="navigation-rail__nav">
        <span className="navigation-rail__label">Workspace</span>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => `navigation-rail__link${isActive ? ' is-active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="navigation-rail__foot">
        <span className="status-dot status-live" aria-hidden="true" />
        <div>
          <strong>System ready</strong>
          <span>Secure intelligence</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
