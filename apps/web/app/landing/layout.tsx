import type { Metadata } from 'next';
import { SiteShell } from '@/shell';
import { SITE_CONFIG } from '@/sites';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Northem', template: '%s · Northem' },
  description: SITE_CONFIG.landing.description,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell site="landing">{children}</SiteShell>;
}
