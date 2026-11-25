import type { Metadata, Viewport } from 'next';
import '@northem/ui/styles/public.css';
import { fontVars } from './fonts';
import { env } from '@northem/core/env';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: 'Northem', template: '%s · Northem' },
  description: 'Northem makes films, tools, impossible shots and social. Perfect imperfections.',
};

export const viewport: Viewport = { themeColor: '#0e0d0c', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
