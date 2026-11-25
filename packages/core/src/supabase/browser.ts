'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

let client: SupabaseClient | null = null;

/** Browser client (realtime chat, uploads). One instance per tab. */
export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    const domain = typeof window !== 'undefined' && window.location.hostname.endsWith(env.rootDomain) ? `.${env.rootDomain}` : undefined;
    client = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, domain ? { cookieOptions: { domain } } : undefined);
  }
  return client;
}
