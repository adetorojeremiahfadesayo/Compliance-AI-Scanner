import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, PlusCircle, Globe, Zap } from 'lucide-react';

function Sidebar() {
  const baseLink = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '11px 14px', borderRadius: 'var(--radius-md)',
    textDecoration: 'none', transition: 'all var(--transition-fast)',
    fontSize: '14px', fontWeight: '500',
  };

  const linkStyle = ({ isActive }) => isActive ? {
    ...baseLink,
    color: '#000',
    background: 'var(--gradient-primary)',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(88,166,255,0.25)',
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
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '0 4px' }}>
        <div style={{
          background: 'var(--gradient-primary)', padding: '8px', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(88,166,255,0.3)',
        }}>
          <Shield size={18} color="#000" />
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '15px', fontWeight: '800', letterSpacing: '-0.4px' }}>ComplianceOS</span>
          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>GLOBAL ENGINE</span>
        </div>
      </div>

      {/* Tagline chip */}
      <div style={{ marginBottom: '28px', padding: '0 4px' }}>
        <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.12)', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={11} color="var(--accent-blue)" />
          <span>25 countries · 3 industries</span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-tertiary)', letterSpacing: '1.5px', padding: '0 14px', marginBottom: '6px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        <NavLink to="/" end style={linkStyle}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/new-analysis" style={linkStyle}>
          <PlusCircle size={17} />
          <span>New Scan</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(88,166,255,0.06), rgba(188,140,255,0.06))',
          border: '1px solid rgba(88,166,255,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Zap size={12} color="var(--accent-blue)" />
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-blue)' }}>Real-time Engine</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
            Regulations fetched live for your selected country & industry
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
