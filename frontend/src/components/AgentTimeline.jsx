import { Terminal, Code, AlertTriangle, ShieldCheck, PlayCircle, Loader2 } from 'lucide-react';

function AgentTimeline({ events = [] }) {
  const getAgentIcon = (agentName) => {
    switch (agentName.toLowerCase()) {
      case 'orchestrator':
        return <PlayCircle size={14} color="var(--accent-blue)" />;
      case 'regulationparser':
        return <Terminal size={14} color="var(--accent-purple)" />;
      case 'codebaseanalyzer':
        return <Code size={14} color="var(--status-partial)" />;
      case 'gapdetector':
        return <AlertTriangle size={14} color="var(--status-non-compliant)" />;
      case 'remediationengine':
        return <ShieldCheck size={14} color="var(--status-compliant)" />;
      default:
        return <Terminal size={14} color="var(--text-secondary)" />;
    }
  };

  const getAgentColor = (agentName) => {
    switch (agentName.toLowerCase()) {
      case 'orchestrator': return 'rgba(88, 166, 255, 0.15)';
      case 'regulationparser': return 'rgba(188, 140, 255, 0.15)';
      case 'codebaseanalyzer': return 'rgba(210, 153, 34, 0.15)';
      case 'gapdetector': return 'rgba(248, 81, 73, 0.15)';
      case 'remediationengine': return 'rgba(63, 185, 80, 0.15)';
      default: return 'rgba(139, 148, 158, 0.15)';
    }
  };

  if (!events.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', gap: '12px' }}>
        <Loader2 className="status-dot-pulsing" size={24} />
        <span>Waiting for agent logs to stream...</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Central line */}
      <div style={{
        position: 'absolute',
        left: '6px',
        top: '10px',
        bottom: '10px',
        width: '1px',
        backgroundColor: 'var(--border-primary)',
        zIndex: 0
      }} />

      {events.map((event, index) => {
        const timestampStr = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
        const agentBg = getAgentColor(event.agent_name);
        
        return (
          <div key={index} className="slide-up" style={{ 
            display: 'flex', 
            position: 'relative',
            zIndex: 1,
            gap: '16px'
          }}>
            {/* Dot/Icon */}
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-primary)',
              border: '2px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '4px',
              marginLeft: '-1px'
            }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }} />
            </div>

            {/* Content box */}
            <div style={{
              flex: 1,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: agentBg,
                    color: 'var(--text-primary)'
                  }}>
                    {getAgentIcon(event.agent_name)}
                    {event.agent_name}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {event.action.replace('_', ' ')}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {timestampStr}
                </span>
              </div>

              {/* Details */}
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {event.details}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AgentTimeline;
