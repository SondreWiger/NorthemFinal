import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env, serverEnv } from '../env';

/**
 * Service-role client. Bypasses RLS, so only use it after checking who the
 * caller is and what they may do: public form inserts, sending invites,
 * reading auth.users by email.
 */
export function supabaseAdmin() {
  const key = serverEnv().serviceRoleKey;
  if (!env.supabaseUrl || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hasServiceRole() {
  return Boolean(env.supabaseUrl && serverEnv().serviceRoleKey);
}
