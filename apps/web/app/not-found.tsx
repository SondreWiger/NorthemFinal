import { Compass } from '@northem/ui/micro';

export default function NotFound() {
  return (
    <main className="nm-wrap" style={{ minHeight: '80vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <Compass style={{ width: 160, margin: '0 auto 24px', color: 'var(--muted)' }} />
        <p className="nm-kicker">404 · off the map</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,6vw,64px)', margin: '8px 0 16px', textTransform: 'uppercase' }}>Nothing out here</h1>
        <p className="nm-sub">The page you were looking for wandered off. The compass is still searching.</p>
        <p><a className="nm-btn" href="/">Back to base</a></p>
      </div>
    </main>
  );
}
