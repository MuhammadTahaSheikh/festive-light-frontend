import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { SITE_HOME } from '../../config/site.js';
import './login.css';

function SignInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Login() {
  const { signIn, signUp, isDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password, name);
      navigate('/');
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-body">
          <h1 className="auth-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to your account' : 'Sign up for your account'}
          </p>

          {isDemo && (
            <div className="auth-demo">
              Demo mode — any email &amp; password works. Add Supabase keys to enable real accounts.
            </div>
          )}

          <form onSubmit={submit}>
            {!isLogin && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-name">
                  Your name<span className="req">*</span>
                </label>
                <input
                  id="auth-name"
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">
                Email<span className="req">*</span>
              </label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                Password<span className="req">*</span>
              </label>
              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon off={!showPassword} />
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="auth-row">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <button type="button" className="auth-forgot">
                  Forgot password?
                </button>
              </div>
            )}

            {err && <div className="auth-err" role="alert">{err}</div>}

            <button className="auth-submit" type="submit" disabled={busy}>
              <SignInIcon />
              {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? (
              <>
                No account?{' '}
                <button type="button" onClick={() => setMode('signup')}>Sign up</button>
              </>
            ) : (
              <>
                Already have one?{' '}
                <button type="button" onClick={() => setMode('login')}>Sign in</button>
              </>
            )}
          </p>

          <p className="auth-back">
            <a href={SITE_HOME}>
              &larr; Back to site
            </a>
          </p>
        </div>

        <div className="auth-wave" aria-hidden="true">
          <svg viewBox="0 0 420 42" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0,42 L0,18 C70,4 140,34 210,20 C280,6 350,30 420,14 L420,42 Z"
              fill="#f49321"
            />
            <path
              d="M0,42 L0,26 C80,12 150,38 220,24 C290,10 360,36 420,22 L420,42 Z"
              fill="#1c325a"
            />
          </svg>
        </div>

        <div className="auth-footer">
          <p className="auth-legal">
            By continuing, you agree to our{' '}
            <a href="#">Terms of Use</a>
            {' '}and{' '}
            <a href="#">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
