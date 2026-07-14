import ComplianceGauge from './ComplianceGauge';
import { getConfidenceState } from '../utils/confidenceModel';

function ConfidenceInstrument({ score = 0, status = 'pending', progress = 0, label = 'Confidence score', meta = [] }) {
  const confidence = getConfidenceState(score);
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <section className={`confidence-instrument confidence-instrument--${confidence.tone}`}>
      <div className="confidence-instrument__gauge">
        <ComplianceGauge score={confidence.score} size={190} label={label} />
      </div>
      <div className="confidence-instrument__body">
        <div className="confidence-instrument__state">
          <span>{status}</span>
          <strong>{confidence.label}</strong>
        </div>
        <div className="confidence-instrument__progress" aria-label={`${Math.round(safeProgress)} percent complete`}>
          <i style={{ width: `${safeProgress}%` }} />
        </div>
        <dl className="confidence-instrument__meta">
          {meta.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default ConfidenceInstrument;
