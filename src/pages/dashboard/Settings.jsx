import { useState } from 'react';
import { PageHead } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { COMPANY_PHONE } from '../../config/site.js';

export default function Settings() {
  const { user } = useAuth();
  const [company, setCompany] = useState('Festive Lighting Pros');
  const [phone, setPhone] = useState(COMPANY_PHONE);
  const [rate, setRate] = useState('40');
  const [saved, setSaved] = useState(false);

  function save(e) {
    e.preventDefault();
    try { localStorage.setItem('flp_settings', JSON.stringify({ company, phone, rate })); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div>
      <PageHead title="Settings" subtitle="Your company details and default pricing." />
      <form className="card" style={{ maxWidth: 520 }} onSubmit={save}>
        <label className="field">Company name</label>
        <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        <label className="field">Account email</label>
        <input className="input" value={user?.email || ''} disabled />
        <label className="field">Phone</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="field">Default price per linear foot</label>
        <input className="input" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
        <button className="btn" style={{ marginTop: 16 }}>{saved ? 'Saved \u2713' : 'Save settings'}</button>
      </form>
    </div>
  );
}
