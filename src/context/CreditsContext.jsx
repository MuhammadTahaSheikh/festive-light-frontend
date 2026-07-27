import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAccountEmail } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CreditsContext = createContext(null);

export function CreditsProvider({ children }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [lowBalance, setLowBalance] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(10);
  const [creditsPerRender, setCreditsPerRender] = useState(1);
  const [billingMode, setBillingMode] = useState('demo');
  const [loading, setLoading] = useState(true);
  const [buyOpen, setBuyOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.creditBalance();
      setBalance(data.balance);
      setLowBalance(Boolean(data.lowBalance));
      setLowBalanceThreshold(data.lowBalanceThreshold ?? 10);
      setCreditsPerRender(data.creditsPerRender ?? 1);
      setBillingMode(data.billingMode || 'demo');
    } catch {
      setBalance((b) => (b == null ? 0 : b));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAccountEmail(user?.email || 'default');
    refresh();
  }, [user?.email, refresh]);

  async function purchase(credits, promoCode = '') {
    const useDemo = billingMode === 'demo';
    const res = await api.purchaseCredits({
      credits,
      promoCode,
      ...(useDemo ? { demoConfirm: true } : {}),
    });
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
      return res;
    }
    setBalance(res.balance);
    await refresh();
    return res;
  }

  function openBuyCredits() {
    setBuyOpen(true);
  }

  function closeBuyCredits() {
    setBuyOpen(false);
  }

  return (
    <CreditsContext.Provider
      value={{
        balance,
        lowBalance,
        lowBalanceThreshold,
        creditsPerRender,
        billingMode,
        loading,
        refresh,
        purchase,
        buyOpen,
        openBuyCredits,
        closeBuyCredits,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
