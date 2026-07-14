import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, PlusCircle, Globe, Zap } from 'lucide-react';

function Sidebar() {
  const baseLink = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: 'var(--radius-md)',
    textDecoration: 'none', transition: 'all var(--transition-fast)',
    fontSize: '14px', fontWeight: '500',
    borderLeft: '2px solid transparent',
  };

  const linkStyle = ({ isActive }) => isActive ? {
    ...baseLink,
    color: 'var(--text-primary)',
    background: 'rgba(var(--accent-rgb), 0.07)',
    borderLeft: '2px solid var(--accent)',
    fontWeight: '600',
  } : {
    ...baseLink,
    color: 'var(--text-secondary)',
  };

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      height: '100vh',
      position: 'fixed', left: 0, top: 0,
      display: 'flex', flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 100,
    }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '0 4px' }}>
        <div style={{
          background: 'var(--accent)', padding: '8px', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={18} color="var(--accent-ink)" strokeWidth={2.2} />
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '15px', fontWeight: '750', letterSpacing: '-0.2px', fontVariationSettings: "'wdth' 120" }}>ComplianceOS</span>
          <span className="mono" style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-tertiary)', letterSpacing: '0.18em' }}>GLOBAL ENGINE</span>
        </div>
      </div>

      {/* Coverage line */}
      <div style={{ marginBottom: '28px', padding: '0 4px' }}>
        <div className="mono" style={{ padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Globe size={11} color="var(--accent)" />
          <span>25 countries · 3 industries</span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div className="label" style={{ padding: '0 14px', marginBottom: '8px' }}>
          Navigation
        </div>
        <NavLink to="/" end style={linkStyle}>
          <LayoutDashboard size={16} strokeWidth={1.8} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/new-analysis" style={linkStyle}>
          <PlusCircle size={16} strokeWidth={1.8} />
          <span>New Scan</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
            <Zap size={12} color="var(--accent)" />
            <span className="mono" style={{ fontSize: '10.5px', fontWeight: '500', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>RULE PACK ENGINE</span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
            Source-backed rule packs for your selected country and industry
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
