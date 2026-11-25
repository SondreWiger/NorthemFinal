'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookieDomainFor, env } from '../env';

let client: SupabaseClient | null = null;

/** Browser client (realtime chat, uploads). One instance per tab. */
export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    const domain = typeof window !== 'undefined' ? cookieDomainFor(window.location.hostname, env.rootDomain) : undefined;
    client = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, domain ? { cookieOptions: { domain } } : undefined);
  }
  return client;
}
