import type { ReactNode } from 'react';
import { initials } from '@northem/core/format';
import { NorthemMark } from '../micro';
import { rng } from '../micro';
import { MobileBar, NavLinks, type NavItem } from './client';

export { NavLinks, MobileBar, Submit, ConfirmSubmit } from './client';
export type { NavItem } from './client';

export function UserAvatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="av" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  const r = rng(name || '?');
  const hue = Math.floor(r() * 360);
  return (
    <span className="av" aria-hidden style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 32% 38%)` }}>
      {initials(name || '?')}
    </span>
  );
}

export function AppShell({ brand, product, accent, logoUrl, nav, me, children }: {
  brand: string; product: string; accent?: string; logoUrl?: string | null; nav: NavItem[];
  me: { name: string; sub: string; avatar?: string | null; href: string }; children: ReactNode;
}) {
  const side = (
    <>
      <a href="/" className="app-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logoUrl ? <img src={logoUrl} alt="" /> : <NorthemMark />}
        <span>{brand}<small>{product}</small></span>
      </a>
      <NavLinks items={nav} />
      <div className="app-me">
        <UserAvatar name={me.name} src={me.avatar} />
        <a href={me.href}><strong>{me.name || 'You'}</strong><small>{me.sub}</small></a>
        <form action="/auth/signout" method="post"><button className="btn btn-ghost btn-sm" title="Sign out" aria-label="Sign out">⎋</button></form>
      </div>
    </>
  );
  return (
    <div className="app" style={accent ? ({ ['--accent' as string]: accent }) : undefined}>
      <aside className="app-side app-side-desktop">{side}</aside>
      <div style={{ minWidth: 0 }}>
        <div className="app-mobile-only"><MobileBar title={brand}>{side}</MobileBar></div>
        <main className="app-main" id="main">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, crumbs, actions }: { title: ReactNode; sub?: ReactNode; crumbs?: { href: string; label: string }[]; actions?: ReactNode }) {
  return (
    <header className="ph">
      <div>
        {crumbs?.length ? <div className="crumbs">{crumbs.map((c, i) => <span key={c.href}>{i ? ' / ' : ''}<a href={c.href}>{c.label}</a></span>)}</div> : null}
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="ph-actions">{actions}</div> : null}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>;
}

export function Notice({ kind, children }: { kind?: 'ok' | 'bad'; children: ReactNode }) {
  return <div className={`notice ${kind ? `notice-${kind}` : ''}`} role={kind === 'bad' ? 'alert' : 'status'}>{children}</div>;
}
