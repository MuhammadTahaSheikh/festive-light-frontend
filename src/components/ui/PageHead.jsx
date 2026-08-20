export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="spacer" />
      {children && <div className="page-head-actions">{children}</div>}
    </div>
  );
}
