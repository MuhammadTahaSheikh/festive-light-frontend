import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import './campaign-tour.css';

export const CAMPAIGN_TOUR_KEY = 'flp_campaign_tour_v1';

export const CAMPAIGN_TOUR_STEPS = [
  {
    id: 'pick-homes',
    badge: 'First campaign',
    title: 'Pick the homes to quote',
    body: 'Just installed nearby? Type that address in the search box, choose how many closest neighbors, and hit "Find neighbors". Or draw an area on the map with the box or lasso.',
    placement: 'left',
  },
  {
    id: 'render-options',
    badge: 'First campaign',
    title: 'Set light color & pricing',
    body: 'Choose the light color for this batch, optional landscape and décor, and your price per linear foot. Load discovered houses into the campaign when you are ready.',
    placement: 'right',
  },
  {
    id: 'make-quotes',
    badge: 'First campaign',
    title: 'Make quotes & mail',
    body: 'Hit Make Quotes to AI-render every home (1 credit each). When renders finish, pick an address and send a mailed design quote — preview the postcard PDF or mail it live.',
    placement: 'right',
  },
];

function readTourDone() {
  try {
    return localStorage.getItem(CAMPAIGN_TOUR_KEY) === '1';
  } catch {
    return false;
  }
}

function markTourDone() {
  try {
    localStorage.setItem(CAMPAIGN_TOUR_KEY, '1');
  } catch { /* ignore */ }
}

function measureTarget(el) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const pad = 8;
  return {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function placeCard(spot, placement, cardW, cardH) {
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = spot.top;
  let left = spot.left + spot.width + gap;

  if (placement === 'left') {
    left = spot.left - cardW - gap;
    top = spot.top;
  } else if (placement === 'right') {
    left = spot.left + spot.width + gap;
    top = spot.top;
  }

  if (left < 12) left = 12;
  if (left + cardW > vw - 12) left = vw - cardW - 12;
  if (top + cardH > vh - 12) top = vh - cardH - 12;
  if (top < 12) top = 12;

  return { top, left };
}

export function useCampaignTour(enabled = true) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled || readTourDone()) return undefined;
    const t = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(t);
  }, [enabled]);

  const dismiss = useCallback(() => {
    markTourDone();
    setOpen(false);
    setStep(0);
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= CAMPAIGN_TOUR_STEPS.length - 1) return s;
      return s + 1;
    });
  }, []);

  const finish = useCallback(() => {
    markTourDone();
    setOpen(false);
    setStep(0);
  }, []);

  return { open, step, next, dismiss, finish };
}

export default function CampaignTour({ open, step, targetRefs, onNext, onSkip, onFinish }) {
  const [spot, setSpot] = useState(null);
  const [cardPos, setCardPos] = useState({ top: 24, left: 24 });
  const current = CAMPAIGN_TOUR_STEPS[step];
  const isLast = step === CAMPAIGN_TOUR_STEPS.length - 1;
  const targetEl = current ? targetRefs[current.id]?.current : null;

  const updateLayout = useCallback(() => {
    if (!open || !targetEl) return;
    const nextSpot = measureTarget(targetEl);
    if (!nextSpot) return;
    setSpot(nextSpot);
    targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const cardW = 340;
    const cardH = 220;
    setCardPos(placeCard(nextSpot, current.placement, cardW, cardH));
  }, [open, targetEl, current?.placement]);

  useLayoutEffect(() => {
    updateLayout();
  }, [updateLayout, step, open]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', updateLayout, true);
    };
  }, [open, updateLayout]);

  if (!open || !current || !spot) return null;

  return (
    <div className="ct-root" role="dialog" aria-modal="true" aria-label="Campaign walkthrough">
      <div
        className="ct-spotlight"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />
      <div className="ct-card" style={{ top: cardPos.top, left: cardPos.left }}>
        <div className="ct-badge">{current.badge}</div>
        <h3 className="ct-title">{current.title}</h3>
        <p className="ct-body">{current.body}</p>
        <div className="ct-foot">
          <span className="ct-step">Step {step + 1} of {CAMPAIGN_TOUR_STEPS.length}</span>
          <div className="ct-actions">
            <button type="button" className="ct-skip" onClick={onSkip}>Skip tour</button>
            <button type="button" className="btn sm ct-next" onClick={isLast ? onFinish : onNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
