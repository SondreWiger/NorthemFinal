import type { ReactNode } from 'react';
import type { SiteKey } from '@northem/core/types';
import { siteUrl, env } from '@northem/core/env';
import { isDemo } from '@northem/core/queries';
import { NorthemMark } from '@northem/ui/micro';
import { DemoBanner, SiteFx } from '@northem/ui/public';
import { SITE_CONFIG } from './sites';
import './shell.css';

const ORDER: SiteKey[] = ['landing', 'prod', 'dev', 'specprod', 'so'];

/** Header + footer shared by all five sites; each site styles them its own way. */
export function SiteShell({ site, children, logo }: { site: SiteKey; children: ReactNode; logo?: ReactNode }) {
  const c = SITE_CONFIG[site];
  const year = new Date().getFullYear();
  return (
    <div className={`site site-${site}`} data-site={site}>
      <a href="#main" className="nm-skip">Skip to content</a>
      <header className="site-head">
        <a href="/" className="site-logo" aria-label={`${c.name} home`}>
          {logo ?? <><NorthemMark className="site-mark" /><span>{c.short}</span></>}
        </a>
        <nav aria-label="Main" className="site-nav">
          {c.nav.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
        </nav>
        <a className="site-portal" href={`${env.portalUrl}/login`}>Crew login</a>
      </header>
      <main id="main">{children}</main>
      <footer className="site-foot">
        <div className="site-foot-inner">
          <div className="site-foot-brand">
            <NorthemMark className="site-mark" />
            <p>{c.description}</p>
          </div>
          <nav aria-label="Northem" className="site-foot-houses">
            <span className="nm-kicker">The houses</span>
            {ORDER.map((k) => (
              <a key={k} href={k === site ? '/' : siteUrl(k, '/')} aria-current={k === site ? 'page' : undefined}>
                {SITE_CONFIG[k].name}
              </a>
            ))}
          </nav>
          <nav aria-label="More" className="site-foot-more">
            <span className="nm-kicker">More</span>
            {c.nav.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
            <a href={siteUrl('landing', '/press')}>Press</a>
            <a href={siteUrl('landing', '/pro')}>Northem Pro</a>
            <a href={`${env.portalUrl}/login`}>Crew login</a>
          </nav>
        </div>
        <p className="site-foot-legal">© {year} Northem · Made in the north, with perfect imperfections.</p>
      </footer>
      <DemoBanner show={isDemo} />
      <SiteFx />
    </div>
  );
}
