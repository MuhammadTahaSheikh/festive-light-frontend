export function StatCard({ k, v, s, accent }) {
  return (
    <div className="stat-card" style={{ '--accent': accent }}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}
