import { PageHead, EmptyState } from '../../components/ui/index.js';

const COLUMNS = ['Lead', 'Quoted', 'Scheduled', 'Installed'];

export default function Jobs() {
  return (
    <div>
      <PageHead title="Jobs" subtitle="Track each install from first contact to completed job." />
      <div className="grid-jobs">
        {COLUMNS.map((c) => (
          <div className="card" key={c} style={{ minHeight: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center' }}>
              {c}<span className="pill" style={{ marginLeft: 'auto' }}>0</span>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>No jobs in this stage.</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <EmptyState ico={'\u{1F528}'} title="Your job pipeline is empty">
          Jobs are created when a lead accepts a quote. Convert a quote to start tracking an install here.
        </EmptyState>
      </div>
    </div>
  );
}
