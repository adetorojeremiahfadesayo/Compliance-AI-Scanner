import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';

function RequirementCard({
  title,
  article_reference,
  status,
  severity,
  description,
  gap_description,
  remediation_plan,
  code_location,
  agent_name,
  selected = false,
  onSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isCompliant = status === 'compliant';
  const isPartial = status === 'partial';
  const badgeClass = isCompliant ? 'badge-compliant' : isPartial ? 'badge-partial' : 'badge-non-compliant';
  const statusText = isCompliant ? 'Compliant' : isPartial ? 'Partial' : 'Non-Compliant';
  const StatusIcon = isCompliant ? ShieldCheck : AlertTriangle;

  const handleToggle = () => {
    onSelect?.();
    setIsOpen((open) => !open);
  };

  return (
    <article className={`requirement-card${selected ? ' is-selected' : ''}`}>
      <button type="button" className="requirement-card__header" onClick={handleToggle} aria-expanded={isOpen}>
        <span className="requirement-card__chevron">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <span className="requirement-card__identity"><small>{article_reference}</small><strong>{title}</strong></span>
        <span className={`requirement-card__severity is-${severity || 'unknown'}`}>{severity || 'unrated'}</span>
        <span className={`badge ${badgeClass}`}><StatusIcon size={13} /><span>{statusText}</span></span>
      </button>

      {isOpen ? (
        <div className="requirement-card__body">
          <section>
            <h5>Legal requirement</h5>
            <p>{description}</p>
          </section>
          {!isCompliant && gap_description ? (
            <section className="requirement-card__gap">
              <h5><AlertTriangle size={13} /> Detected compliance gap</h5>
              <p>{gap_description}</p>
              <dl>
                {code_location ? <div><dt>File</dt><dd className="mono">{code_location}</dd></div> : null}
                <div><dt>Agent</dt><dd className="mono">{agent_name || 'GapDetector'}</dd></div>
              </dl>
            </section>
          ) : null}
          {!isCompliant && remediation_plan ? (
            <section className="requirement-card__remediation">
              <h5>Remediation actions required</h5>
              <div>{remediation_plan}</div>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default RequirementCard;
