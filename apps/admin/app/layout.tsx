import type { Metadata } from 'next';
import '@northem/ui/styles/public.css';
import '@northem/ui/styles/app.css';
import { fontVars } from './fonts';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
