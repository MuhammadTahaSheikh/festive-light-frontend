import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHead } from '../../components/ui/index.js';
import { api } from '../../api/client.js';
import { useCredits } from '../../context/CreditsContext.jsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Billing() {
  const { balance, creditsPerRender, billingMode, loading, openBuyCredits, refresh } = useCredits();
  const [searchParams, setSearchParams] = useSearchParams();
  const [txs, setTxs] = useState([]);
  const [txErr, setTxErr] = useState('');
  const [purchaseMsg, setPurchaseMsg] = useState('');

  useEffect(() => {
    const status = searchParams.get('purchase');
    const sessionId = searchParams.get('session_id');
    if (status === 'cancelled') {
      setPurchaseMsg('Checkout cancelled — no charge was made.');
      setSearchParams({}, { replace: true });
      return;
    }
    if (status === 'success' && sessionId) {
      setPurchaseMsg('Confirming payment…');
      api.confirmCreditPurchase({ sessionId })
        .then((d) => {
          setPurchaseMsg(
            d.alreadyFulfilled
              ? `Payment already applied — balance is ${d.balance?.toLocaleString()} credits.`
              : `Payment successful — ${d.purchased?.toLocaleString()} credits added.`,
          );
          return refresh();
        })
        .catch((e) => setPurchaseMsg(e.message))
        .finally(() => setSearchParams({}, { replace: true }));
    }
  }, [searchParams, setSearchParams, refresh]);

  useEffect(() => {
    api.creditTransactions()
      .then((d) => setTxs(d.transactions || []))
      .catch((e) => setTxErr(e.message));
  }, [balance]);

  return (
    <div>
      <PageHead title="Billing" subtitle="Credit wallet for outreach renders — same model as Light Launch.">
        <button type="button" className="btn sm" onClick={openBuyCredits}>Buy Credits</button>
        <button type="button" className="btn ghost sm" onClick={refresh}>Refresh</button>
      </PageHead>

      {purchaseMsg && (
        <p className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>{purchaseMsg}</p>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="k muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Credit balance</div>
          <div style={{ fontSize: 36, fontWeight: 800, margin: '6px 0', color: 'var(--gold)' }}>
            {loading ? '…' : (balance ?? 0).toLocaleString()}
          </div>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
            {creditsPerRender} credit per outreach render · Mode: {billingMode}
          </p>
          <button type="button" className="btn" onClick={openBuyCredits}>Buy more credits.</button>
        </div>
        <div className="card">
          <div className="k muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Pricing</div>
          <div style={{ fontSize: 15, fontWeight: 600, margin: '8px 0', lineHeight: 1.5 }}>
            500–999 credits @ $1.00<br />
            2,500+ @ $0.95 · 5,000+ @ $0.92 · 10,000+ @ $0.90
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Promo codes: WELCOME10, SAVE10 (10% off). Single-house widget still uses free renders.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="k muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          Recent transactions
        </div>
        {txErr && <p className="muted">{txErr}</p>}
        {!txErr && txs.length === 0 && <p className="muted">No transactions yet.</p>}
        {txs.length > 0 && (
          <div className="table-scroll">
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th align="left">Date</th>
                <th align="left">Reason</th>
                <th align="right">Change</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{fmtDate(t.created_at)}</td>
                  <td>{t.reason}{t.meta?.address ? ` · ${t.meta.address}` : ''}</td>
                  <td align="right" style={{ color: t.delta > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    {t.delta > 0 ? '+' : ''}{t.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
