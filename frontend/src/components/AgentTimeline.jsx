import { Terminal, Code, AlertTriangle, ShieldCheck, PlayCircle, Loader2, Radar, UserCheck, GitPullRequest } from 'lucide-react';

const AGENT_ICONS = {
  orchestrator: PlayCircle,
  regulationparser: Terminal,
  codebaseanalyzer: Code,
  gapdetector: AlertTriangle,
  remediationengine: ShieldCheck,
  monitoragent: Radar,
  georegulator: Radar,
  humanreviewer: UserCheck,
  scorecalculator: ShieldCheck,
};

function AgentTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', gap: '12px', padding: '32px 0' }}>
        <Loader2 className="status-dot-pulsing" size={22} />
        <span style={{ fontSize: '13.5px' }}>Waiting for agent logs to stream…</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Rail */}
      <div style={{ position: 'absolute', left: '6px', top: '10px', bottom: '10px', width: '1px', backgroundColor: 'var(--border-primary)', zIndex: 0 }} />

      {events.map((event, index) => {
        const timestampStr = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
        const isLatest = index === events.length - 1;
        const key = (event.agent_name || '').toLowerCase();
        const Icon = AGENT_ICONS[key] || (key.includes('pr') ? GitPullRequest : Terminal);

        return (
          <div key={index} className="slide-up" style={{ display: 'flex', position: 'relative', zIndex: 1, gap: '16px' }}>
            {/* Node */}
            <div
              className={isLatest ? 'status-live' : undefined}
              style={{
                width: '13px', height: '13px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: 'var(--bg-primary)',
                border: `1.5px solid ${isLatest ? 'var(--accent)' : 'var(--border-strong)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '5px', marginLeft: '-0.5px',
              }}
            >
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isLatest ? 'var(--accent)' : 'var(--text-tertiary)' }} />
            </div>

            {/* Entry */}
            <div style={{
              flex: 1,
              backgroundColor: 'var(--bg-secondary)',
              border: `1px solid ${isLatest ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border-primary)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              transition: 'border-color var(--transition-normal)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '7px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                  <span className="mono" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '10.5px', letterSpacing: '0.06em', fontWeight: '500',
                    padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    color: isLatest ? 'var(--accent)' : 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}>
                    <Icon size={12} strokeWidth={1.8} />
                    {event.agent_name}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {(event.action || '').replaceAll('_', ' ')}
                  </span>
                </div>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {timestampStr}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.55', overflowWrap: 'anywhere' }}>
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
