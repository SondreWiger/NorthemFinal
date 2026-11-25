import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NorthemMark } from '@northem/ui/micro';
import { getSession, currentOrg } from '@northem/core/session';
import { hasSupabase } from '@northem/core/env';
import { LoginForm } from '@/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function Login(props: PageProps<'/login'>) {
  const sp = await props.searchParams;
  const next = typeof sp.next === 'string' && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/';
  if (hasSupabase && (await getSession())) redirect(next);
  const org = hasSupabase ? await currentOrg() : null;
  const brand = `${org?.name ?? 'Northem'} Admin`;
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand"><NorthemMark />{brand}</div>
        <h1>Welcome back</h1>
        <p className="muted" style={{ margin: 0 }}>Projects, people, public pages and the inbox.</p>
        {!hasSupabase ? <div className="notice notice-bad">Supabase isn&apos;t configured for this deployment yet. See SETUP.md.</div> : null}
        {typeof sp.error === 'string' ? <div className="notice notice-bad">That link didn&apos;t work. It may have expired, so try again.</div> : null}
        <LoginForm next={next} allowSignup={false} />
      </div>
    </main>
  );
}
