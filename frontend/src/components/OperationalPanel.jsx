function OperationalPanel({ title, meta, action, className = '', children }) {
  return (
    <section className={`operational-panel ${className}`.trim()}>
      {title || meta || action ? (
        <header className="operational-panel__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {meta ? <span>{meta}</span> : null}
          </div>
          {action ? <div className="operational-panel__action">{action}</div> : null}
        </header>
      ) : null}
      <div className="operational-panel__body">{children}</div>
    </section>
  );
}

export default OperationalPanel;
