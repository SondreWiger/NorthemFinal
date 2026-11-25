'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';

export async function acceptInvite(fd: FormData) {
  const token = String(fd.get('token') ?? '');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token });
  if (error) redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(error.message)}`);
  const res = data as { project_id: string | null } | null;
  redirect(res?.project_id ? `/me?welcome=1&project=${res.project_id}` : '/me?welcome=1');
}
