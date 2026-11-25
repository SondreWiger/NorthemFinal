'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { env, hasSupabase } from '@northem/core/env';

export interface AuthState { ok?: boolean; message?: string }

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === 'string' ? next : '/';
  return n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function authAction(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  if (!hasSupabase) return { message: 'Supabase is not configured for this deployment yet.' };
  const mode = String(fd.get('mode') ?? 'password');
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safeNext(fd.get('next'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: 'Enter your email address.' };
  const supabase = await supabaseServer();
  const redirectTo = `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`;

  if (mode === 'magic') {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    return error ? { message: error.message } : { ok: true, message: `Check ${email}. The sign-in link works once.` };
  }
  if (mode === 'signup') {
    if (password.length < 8) return { message: 'Use at least 8 characters for the password.' };
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (error) return { message: error.message };
    if (!data.session) return { ok: true, message: `Almost done. Confirm the address from the mail we sent to ${email}.` };
    redirect(next);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message };
  redirect(next);
}

export async function resetPassword(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!email) return { message: 'Enter your email first.' };
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.portalUrl}/auth/callback?next=/me?reset=1` });
  return { ok: true, message: 'If that address has an account, a reset link is on its way.' };
}
