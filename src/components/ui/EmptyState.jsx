export function EmptyState({ ico = '\u25A6', title, children, action }) {
  return (
    <div className="card">
      <div className="empty">
        <div className="ico">{ico}</div>
        <h3>{title}</h3>
        <p style={{ maxWidth: '46ch', margin: '0 auto 16px' }}>{children}</p>
        {action}
      </div>
    </div>
  );
}
