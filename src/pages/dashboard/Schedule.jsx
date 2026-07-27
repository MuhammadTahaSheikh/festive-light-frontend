import { PageHead } from '../../components/ui/index.js';

export default function Schedule() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <PageHead
        title="Schedule"
        subtitle={today.toLocaleString('default', { month: 'long', year: 'numeric' }) + ' — installs and consultations.'}
      >
        <button className="btn">+ Add booking</button>
      </PageHead>
      <div className="card">
        <div className="grid-schedule">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="muted" style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '4px 0' }}>{d}</div>
          ))}
          {cells.map((d, i) => (
            <div
              key={i}
              style={{
                minHeight: 74, borderRadius: 8, padding: 6, fontSize: 12,
                border: '1px solid var(--border)',
                background: d === today.getDate() ? 'rgba(244,147,33,.12)' : 'transparent',
                color: d ? 'var(--text)' : 'transparent',
              }}
            >
              {d || ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
