import { Slate } from '@northem/ui/micro';
import { siteMeta } from '@/routes';

export const metadata = siteMeta('landing', 'Northem Pro');

// Northem Pro is sold through Screenplay Studio today; one licence unlocks
// Pro in every app that redeems Northem licence codes.
const APPS = [
  { name: 'Screenplay Studio', what: 'Screenwriting and pre-production', url: 'https://screenplaystudio.fun' },
  { name: 'Cinderra', what: 'Infinite canvas for ideas', url: 'https://cinderra.fun' },
  { name: 'CastingCall', what: 'Casting for indie films', url: 'https://screenplaystudio.fun/casting' },
];

export default function Pro() {
  return (
    <>
      <header className="page-head nm-wrap">
        <span className="nm-kicker">Licence</span>
        <h1>Northem Pro</h1>
        <p>One licence, every Northem tool. Buy it once and redeem the code in any app that supports it.</p>
      </header>
      <section className="nm-wrap page-body">
        <div className="pro-cards">
          <div className="pro-card"><span className="nm-kicker">Monthly</span><strong>$29</strong><small>per month</small></div>
          <div className="pro-card pro-card-hot"><span className="nm-kicker">Yearly</span><strong>$249</strong><small>per year, two months free</small></div>
          <div className="pro-card"><span className="nm-kicker">Team</span><strong>$199</strong><small>per seat, per year</small></div>
        </div>
        <p style={{ marginTop: 24 }}><a className="nm-btn nm-btn-primary" href="https://screenplaystudio.fun/pro">Get Northem Pro <Slate style={{ width: 22 }} /></a></p>
        <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', marginTop: 56 }}>Works in</h2>
        <ul className="nm-openings">
          {APPS.map((a) => (
            <li key={a.name}><a href={a.url}><span className="nm-kicker">{a.what}</span><strong>{a.name}</strong><span className="nm-arrow" aria-hidden>↗</span></a></li>
          ))}
        </ul>
      </section>
    </>
  );
}
