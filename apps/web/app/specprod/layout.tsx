import type { Metadata } from 'next';
import { SiteShell } from '@/shell';
import { SITE_CONFIG } from '@/sites';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Specprod', template: '%s · Specprod' },
  description: SITE_CONFIG.specprod.description,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell site="specprod">{children}</SiteShell>;
}
