import { Link } from 'react-router-dom';
import BrandLogo from '../../components/ui/BrandLogo.jsx';

const STEPS = [
  { n: '01', t: 'Upload a photo', d: 'Snap or upload a photo of the home you want to light up.' },
  { n: '02', t: 'See it lit up', d: 'Our AI shows the house with permanent lighting — instantly.' },
  { n: '03', t: 'Get your quote', d: 'Front roofline and whole-house footage, priced with your rate.' },
];

export default function Landing() {
  return (
    <div>
      <nav className="landing-nav">
        <Link to="/" className="brand" style={{ padding: 0 }}>
          <BrandLogo variant="wordmarkLight" className="logo logo--wordmark" />
        </Link>
        <div style={{ flex: 1 }} />
        <Link to="/try" className="link">See your home</Link>
        <a href="#how" className="link">How it works</a>
        <Link to="/login" className="link">Login</Link>
        <Link to="/login" className="btn sm">Get started</Link>
      </nav>

      <section className="hero">
        <span className="pill gold" style={{ marginBottom: 18 }}>Permanent · Landscape · Holiday lighting</span>
        <h1>See your home lit up before you buy.</h1>
        <p>Upload a photo, pick your colors, and watch your home light up — measured and priced in seconds. No cost, no pressure.</p>
        <div className="cta-row">
          <Link to="/try" className="btn">See your home lit up — free</Link>
          <a href="tel:+19412397919" className="btn ghost">Call (941) 239-7919</a>
        </div>
      </section>

      <section className="section" id="how">
        <h2 style={{ textAlign: 'center', fontSize: 30, marginBottom: 8 }}>How it works</h2>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 28 }}>
          From photo to priced design in under a minute.
        </p>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="card" key={s.n}>
              <div className="pill gold" style={{ marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{s.t}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{s.d}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <Link to="/try" className="btn">Try it on your home</Link>
        </div>
      </section>

      <footer className="section" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        © Festive Lighting Pros. Estimates are approximations — final pricing confirmed on-site.
      </footer>
    </div>
  );
}
