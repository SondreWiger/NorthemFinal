import type { Metadata } from 'next';
import { SiteShell } from '@/shell';
import { SITE_CONFIG } from '@/sites';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Northem Productions', template: '%s · Northem Productions' },
  description: SITE_CONFIG.prod.description,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell site="prod">{children}</SiteShell>;
}
