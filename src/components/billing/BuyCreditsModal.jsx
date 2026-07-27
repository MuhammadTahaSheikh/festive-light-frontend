import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { useCredits } from '../../context/CreditsContext.jsx';
import './buy-credits.css';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function BuyCreditsModal() {
  const { buyOpen, closeBuyCredits, purchase, refresh, balance, billingMode } = useCredits();
  const [packages, setPackages] = useState(null);
  const [credits, setCredits] = useState(2500);
  const [promoCode, setPromoCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!buyOpen) return;
    setErr('');
    api.creditPackages()
      .then((d) => {
        setPackages(d);
        setCredits(2500);
      })
      .catch((e) => setErr(e.message));
  }, [buyOpen]);

  useEffect(() => {
    if (!buyOpen) return;
    const t = setTimeout(() => {
      api.quoteCredits({ credits, promoCode })
        .then((d) => setQuote(d.quote))
        .catch(() => {});
    }, 120);
    return () => clearTimeout(t);
  }, [buyOpen, credits, promoCode]);

  const selectedCard = useMemo(() => {
    if (!packages?.cards) return null;
    return packages.cards.find((c) => c.credits === credits) || null;
  }, [packages, credits]);

  if (!buyOpen) return null;

  async function onPurchase() {
    setBusy(true);
    setErr('');
    try {
      const res = await purchase(credits, promoCode);
      if (res.checkoutUrl) return;
      await refresh();
      closeBuyCredits();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const slider = packages?.slider || { min: 500, max: 25000, step: 500 };

  return (
    <div className="bc-overlay" onClick={closeBuyCredits} role="presentation">
      <div className="bc-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="bc-title">
        <button type="button" className="bc-close" onClick={closeBuyCredits} aria-label="Close">&times;</button>
        <h2 id="bc-title">Buy Credits</h2>
        <p className="bc-sub">
          1 credit = 1 AI render quote. Current balance: <strong>{balance ?? '…'}</strong>
        </p>

        <div className="bc-cards">
          {(packages?.cards || []).map((card) => (
            <button
              key={card.credits}
              type="button"
              className={'bc-card' + (credits === card.credits ? ' active' : '') + (card.featured ? ' featured' : '')}
              onClick={() => setCredits(card.credits)}
            >
              {card.label && <span className="bc-badge">{card.label}</span>}
              <span className="bc-amt">{card.credits.toLocaleString()}</span>
              <span className="bc-lbl">credits</span>
              <span className="bc-price">{fmt(card.total)}</span>
              <span className="bc-per">${card.pricePerCredit.toFixed(2)}/credit</span>
            </button>
          ))}
        </div>

        <div className="bc-slider-wrap">
          <label className="field" htmlFor="bc-slider">Custom amount</label>
          <input
            id="bc-slider"
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
          />
          <div className="bc-slider-meta">
            <span>{credits.toLocaleString()} credits</span>
            {quote && <span>{fmt(quote.total)} total</span>}
          </div>
        </div>

        <div className="bc-promo">
          <label className="field" htmlFor="bc-promo">Promo code</label>
          <input
            id="bc-promo"
            className="input"
            placeholder="WELCOME10 or SAVE10"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
        </div>

        {quote && (
          <div className="bc-summary card">
            <div className="bc-row"><span>Credits</span><span>{quote.credits.toLocaleString()}</span></div>
            <div className="bc-row"><span>Price per credit</span><span>${quote.pricePerCredit.toFixed(2)}</span></div>
            {quote.discount > 0 && (
              <div className="bc-row green"><span>Promo ({quote.promoPercent}% off)</span><span>-{fmt(quote.discount)}</span></div>
            )}
            {quote.savings > 0 && quote.discount === 0 && (
              <div className="bc-row muted"><span>Volume savings</span><span>{fmt(quote.savings)}</span></div>
            )}
            <div className="bc-row total"><span>Total</span><span>{fmt(quote.total)}</span></div>
          </div>
        )}

        {selectedCard?.featured && <p className="bc-hint muted">Popular pack — best balance of price and volume.</p>}
        {err && <p className="bc-err">{err}</p>}

        <button type="button" className="btn block" disabled={busy || !quote} onClick={onPurchase}>
          {busy ? 'Processing…' : billingMode === 'demo' ? `Buy ${credits.toLocaleString()} credits` : `Pay ${quote ? fmt(quote.total) : ''} with card`}
        </button>
        {billingMode === 'demo' ? (
          <p className="bc-demo muted">Demo mode: purchases add credits instantly (no Stripe charge).</p>
        ) : (
          <p className="bc-demo muted">You&apos;ll be redirected to Stripe Checkout (test cards work in test mode).</p>
        )}
      </div>
    </div>
  );
}
