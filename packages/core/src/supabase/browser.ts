'use client';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '../env';

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser client (realtime chat, uploads). One instance per tab. */
export function supabaseBrowser() {
  if (!client) {
    const domain = typeof window !== 'undefined' && window.location.hostname.endsWith(env.rootDomain) ? `.${env.rootDomain}` : undefined;
    client = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, domain ? { cookieOptions: { domain } } : undefined);
  }
  return client;
}
