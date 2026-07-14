import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, ArrowUpDown } from 'lucide-react';

function GapMatrix({ gaps = [] }) {
  const [sortField, setSortField] = useState('article');
  const [sortOrder, setSortOrder] = useState('asc');
  const [expandedGapId, setExpandedGapId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedGapId(expandedGapId === id ? null : id);
  };

  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const sortedGaps = [...gaps].sort((a, b) => {
    let aVal = a.requirement?.article_reference || '';
    let bVal = b.requirement?.article_reference || '';

    if (sortField === 'status') {
      aVal = a.status;
      bVal = b.status;
    } else if (sortField === 'priority') {
      const priorityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
      aVal = priorityWeights[a.priority] || 0;
      bVal = priorityWeights[b.priority] || 0;
    } else if (sortField === 'title') {
      aVal = a.requirement?.title || '';
      bVal = b.requirement?.title || '';
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="badge badge-compliant">
            <CheckCircle size={12} /> Compliant
          </span>
        );
      case 'partial':
        return (
          <span className="badge badge-partial">
            <AlertTriangle size={12} /> Partial
          </span>
        );
      case 'non_compliant':
      default:
        return (
          <span className="badge badge-non-compliant">
            <ShieldAlert size={12} /> Gap
          </span>
        );
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'critical':
        return { color: 'var(--status-non-compliant)', fontWeight: 'bold' };
      case 'high':
        return { color: 'var(--status-non-compliant)' };
      case 'medium':
        return { color: 'var(--status-partial)' };
      case 'low':
      default:
        return { color: 'var(--text-secondary)' };
    }
  };

  // Stats
  const compliantCount = gaps.filter(g => g.status === 'compliant').length;
  const partialCount = gaps.filter(g => g.status === 'partial').length;
  const gapCount = gaps.filter(g => g.status === 'non_compliant').length;

  return (
    <div style={{ width: '100%' }}>
      {/* Mini Stats Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '10px 16px', borderRadius: 'var(--radius-md)', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Compliant Controls</span>
          <span style={{ color: 'var(--status-compliant)', fontWeight: 'bold' }}>{compliantCount}</span>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '10px 16px', borderRadius: 'var(--radius-md)', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Partial Controls</span>
          <span style={{ color: 'var(--status-partial)', fontWeight: 'bold' }}>{partialCount}</span>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '10px 16px', borderRadius: 'var(--radius-md)', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Non-Compliant Gaps</span>
          <span style={{ color: 'var(--status-non-compliant)', fontWeight: 'bold' }}>{gapCount}</span>
        </div>
      </div>

      {/* Grid Table */}
      <div className="table-scroll" style={{
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'rgba(255,255,255,0.01)', userSelect: 'none' }}>
              <th onClick={() => handleSort('article')} style={{ padding: '16px 20px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Clause <ArrowUpDown size={14} />
                </div>
              </th>
              <th onClick={() => handleSort('title')} style={{ padding: '16px 20px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Requirement <ArrowUpDown size={14} />
                </div>
              </th>
              <th onClick={() => handleSort('status')} style={{ padding: '16px 20px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Status <ArrowUpDown size={14} />
                </div>
              </th>
              <th onClick={() => handleSort('priority')} style={{ padding: '16px 20px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Priority <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Agent</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {sortedGaps.map((gap) => {
              const isExpanded = expandedGapId === gap.id;
              const rowBg = gap.status === 'compliant' ? 'rgba(var(--ok-rgb), 0.01)' : (gap.status === 'partial' ? 'rgba(var(--warn-rgb), 0.01)' : 'rgba(var(--risk-rgb), 0.01)');
              
              return (
                <React.Fragment key={gap.id}>
                  <tr 
                    onClick={() => toggleExpand(gap.id)}
                    style={{ 
                      borderBottom: '1px solid var(--border-primary)', 
                      cursor: 'pointer',
                      backgroundColor: rowBg,
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowBg}
                  >
                    <td style={{ padding: '16px 20px', fontWeight: '500', color: 'var(--accent-purple)' }}>
                      {gap.requirement?.article_reference}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {gap.requirement?.title}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {getStatusBadge(gap.status)}
                    </td>
                    <td style={{ padding: '16px 20px', textTransform: 'capitalize', fontSize: '13px', ...getPriorityStyle(gap.priority) }}>
                      {gap.priority}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                      {gap.agent_name || 'GapDetector'}
                    </td>
                    <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {gap.code_location ? gap.code_location.split(':')[0] : 'N/A'}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)', fontSize: '13px', lineHeight: '1.6' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <strong style={{ color: 'var(--text-secondary)' }}>Description:</strong>
                            <p style={{ marginTop: '4px', color: 'var(--text-primary)' }}>{gap.requirement?.description}</p>
                          </div>
                          {gap.gap_description && (
                            <div>
                              <strong style={{ color: 'var(--status-non-compliant)' }}>Gap Identified:</strong>
                              <p style={{ marginTop: '4px', color: 'var(--text-primary)' }}>{gap.gap_description}</p>
                            </div>
                          )}
                          {gap.code_location && (
                            <div>
                              <strong style={{ color: 'var(--accent-blue)' }}>Location Reference:</strong>
                              <p style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{gap.code_location}</p>
                            </div>
                          )}
                          <div>
                            <strong style={{ color: 'var(--accent-blue)' }}>Agent Evidence:</strong>
                            <p style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{gap.agent_name || 'GapDetector'}</p>
                          </div>
                          {gap.remediation_plan && (
                            <div>
                              <strong style={{ color: 'var(--status-compliant)' }}>Remediation Strategy:</strong>
                              <div style={{ 
                                marginTop: '6px', 
                                padding: '12px', 
                                border: '1px solid var(--border-primary)', 
                                borderRadius: '4px', 
                                whiteSpace: 'pre-line',
                                color: 'var(--text-primary)',
                                backgroundColor: 'rgba(255,255,255,0.01)'
                              }}>
                                {gap.remediation_plan}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GapMatrix;
