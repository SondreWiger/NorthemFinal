import type { Metadata } from 'next';
import { SiteShell } from '@/shell';
import { SITE_CONFIG } from '@/sites';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Northem Development', template: '%s · Northem Development' },
  description: SITE_CONFIG.dev.description,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell site="dev">{children}</SiteShell>;
}
