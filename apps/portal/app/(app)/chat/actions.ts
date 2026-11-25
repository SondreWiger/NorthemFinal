'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { requireMember } from '@northem/core/session';
import { ORG_ROLES, type OrgRole } from '@northem/core/types';

export async function openDm(fd: FormData) {
  const s = await requireMember('/chat');
  const db = await supabaseServer();
  const { data, error } = await db.rpc('open_dm', { p_org: s.org.id, p_other: String(fd.get('user_id') ?? '') });
  if (error) redirect(`/chat/new?msg=${encodeURIComponent(error.message)}`);
  redirect(`/chat/${data as string}`);
}

export async function createChannel(fd: FormData) {
  const s = await requireMember('/chat');
  const db = await supabaseServer();
  const kind = fd.get('kind') === 'group' ? 'group' : 'channel';
  const name = String(fd.get('name') ?? '').trim().toLowerCase().replace(/[^a-z0-9æøå_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const members = fd.getAll('members').map(String).filter((x) => x && x !== s.userId);
  if (kind === 'channel' && !name) redirect('/chat/new?msg=Give the channel a name.');
  if (kind === 'group' && !members.length) redirect('/chat/new?msg=Pick at least one person.');
  const minRole = String(fd.get('min_org_role') ?? 'crew') as OrgRole;
  const { data, error } = await db.from('chat_channels').insert({
    org_id: s.org.id, kind, name: name || null, topic: String(fd.get('topic') ?? '').slice(0, 300) || null,
    is_private: kind === 'group' || fd.get('is_private') === 'on', min_org_role: ORG_ROLES.includes(minRole) ? minRole : 'crew', created_by: s.userId,
  }).select('id').single();
  if (error || !data) redirect(`/chat/new?msg=${encodeURIComponent(error?.message.includes('row-level') ? "You can't create channels." : error?.message ?? 'Failed')}`);
  const id = (data as { id: string }).id;
  await db.from('chat_members').insert([{ channel_id: id, user_id: s.userId, is_admin: true }, ...members.map((u) => ({ channel_id: id, user_id: u }))]);
  redirect(`/chat/${id}`);
}

export async function joinChannel(fd: FormData) {
  await requireMember('/chat');
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  const id = String(fd.get('channel_id') ?? '');
  await db.from('chat_members').upsert({ channel_id: id, user_id: u.user!.id }, { onConflict: 'channel_id,user_id', ignoreDuplicates: true });
  redirect(`/chat/${id}`);
}

export async function leaveChannel(fd: FormData) {
  await requireMember('/chat');
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  await db.from('chat_members').delete().eq('channel_id', String(fd.get('channel_id') ?? '')).eq('user_id', u.user!.id);
  redirect('/chat');
}
