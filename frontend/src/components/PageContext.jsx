import { ArrowLeft } from 'lucide-react';

function PageContext({ title, description, status, actions, backAction }) {
  return (
    <header className="page-context">
      <div className="page-context__identity">
        {backAction ? (
          <button type="button" className="page-context__back icon-button" onClick={backAction.onClick} aria-label={backAction.label} title={backAction.label}>
            <ArrowLeft size={17} />
          </button>
        ) : null}
        <div>
          <div className="page-context__title-line">
            <h1>{title}</h1>
            {status}
          </div>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-context__actions">{actions}</div> : null}
    </header>
  );
}

export default PageContext;
