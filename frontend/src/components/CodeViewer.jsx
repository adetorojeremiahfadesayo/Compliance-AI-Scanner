function CodeViewer({ code = '', annotations = [] }) {
  const lines = code.split('\n');

  // Create lookup for annotations by line number
  const annotationsLookup = annotations.reduce((acc, ann) => {
    acc[ann.line_number] = ann;
    return acc;
  }, {});

  return (
    <div style={{ position: 'relative' }}>
      <div className="code-viewer-container">
        {lines.map((lineContent, idx) => {
          const lineNum = idx + 1;
          const ann = annotationsLookup[lineNum];
          
          let highlightClass = '';
          if (ann) {
            highlightClass = `code-viewer-highlighted code-viewer-highlight-${ann.status}`;
          }

          return (
            <div 
              key={idx} 
              className={`code-viewer-line ${highlightClass}`}
              title={ann ? `${ann.status.toUpperCase()}: ${ann.description}` : undefined}
              style={{ position: 'relative' }}
            >
              {/* Line Number */}
              <div className="code-viewer-lineno">{lineNum}</div>
              
              {/* Line Code */}
              <div className="code-viewer-content" style={{ paddingLeft: '8px' }}>
                {lineContent || ' '}
              </div>

              {/* Annotation Overlay Indicator on hover/side */}
              {ann && (
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: ann.status === 'compliant' ? 'var(--status-compliant)' : (ann.status === 'partial' ? 'var(--status-partial)' : 'var(--status-non-compliant)'),
                  color: '#000',
                  fontWeight: '600',
                  pointerEvents: 'none'
                }}>
                  {ann.status.replace('_', ' ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CodeViewer;
