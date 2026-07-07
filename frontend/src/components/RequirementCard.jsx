import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';

function RequirementCard({ 
  title, 
  article_reference, 
  status, 
  severity, 
  description, 
  gap_description,
  remediation_plan,
  code_location,
  agent_name
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusDetails = () => {
    switch (status) {
      case 'compliant':
        return {
          badgeClass: 'badge-compliant',
          text: 'Compliant',
          icon: <ShieldCheck size={16} color="var(--status-compliant)" />
        };
      case 'partial':
        return {
          badgeClass: 'badge-partial',
          text: 'Partial',
          icon: <AlertTriangle size={16} color="var(--status-partial)" />
        };
      case 'non_compliant':
      default:
        return {
          badgeClass: 'badge-non-compliant',
          text: 'Non-Compliant',
          icon: <AlertTriangle size={16} color="var(--status-non-compliant)" />
        };
    }
  };

  const statusInfo = getStatusDetails();

  return (
    <div style={{
      border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-secondary)',
      marginBottom: '16px',
      overflow: 'hidden'
    }}>
      {/* Card Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color var(--transition-fast)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          {isOpen ? <ChevronDown size={18} color="var(--text-secondary)" /> : <ChevronRight size={18} color="var(--text-secondary)" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--accent-purple)', fontWeight: '600' }}>
              {article_reference}
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: '700',
            letterSpacing: '0.5px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: severity === 'critical' ? 'var(--status-non-compliant)' : 'var(--text-secondary)'
          }}>
            {severity}
          </span>
          <div className={`badge ${statusInfo.badgeClass}`}>
            {statusInfo.icon}
            <span>{statusInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div style={{
          padding: '24px',
          borderTop: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-primary)',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Legal Requirement
            </h5>
            <p style={{ color: 'var(--text-primary)' }}>{description}</p>
          </div>

          {/* Gap description */}
          {status !== 'compliant' && gap_description && (
            <div style={{
              backgroundColor: 'rgba(248, 81, 73, 0.03)',
              border: '1px solid rgba(248, 81, 73, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h5 style={{ color: 'var(--status-non-compliant)', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                Detected Compliance Gap
              </h5>
              <p style={{ color: 'var(--text-primary)' }}>{gap_description}</p>
              {code_location && (
                <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  File: <code style={{ color: 'var(--accent-blue)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>{code_location}</code>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                Agent: <code style={{ color: 'var(--accent-blue)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>{agent_name || 'GapDetector'}</code>
              </div>
            </div>
          )}

          {/* Remediation Plan */}
          {status !== 'compliant' && remediation_plan && (
            <div>
              <h5 style={{ color: 'var(--status-compliant)', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Remediation Actions Required
              </h5>
              <div 
                style={{ 
                  color: 'var(--text-primary)', 
                  whiteSpace: 'pre-line',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              >
                {remediation_plan}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RequirementCard;
