import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, PlusCircle, FileText, GitBranch, ExternalLink } from 'lucide-react';

function Sidebar() {
  const linkStyle = ({ isActive }) => isActive ? {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    color: '#000',
    background: 'var(--gradient-primary)',
    fontWeight: '600',
    transition: 'all var(--transition-fast)'
  } : {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    transition: 'all var(--transition-fast)'
  };

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      zIndex: 100
    }}>
      {/* Logo Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{
          background: 'var(--gradient-primary)',
          padding: '8px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Shield size={20} color="#000" />
        </div>
        <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>
          Compliance AP
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <NavLink to="/" style={linkStyle}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/new-analysis" style={linkStyle}>
          <PlusCircle size={18} />
          <span>New Scan</span>
        </NavLink>
      </nav>

      {/* Footer Section */}
      <div style={{
        borderTop: '1px solid var(--border-primary)',
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontSize: '13px'
      }}>
        <a 
          href="https://qwencloud-hackathon.devpost.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          <GitBranch size={14} />
          <span>Hackathon Home</span>
          <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
        </a>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          <FileText size={14} />
          <span>Setup Guides</span>
          <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;
