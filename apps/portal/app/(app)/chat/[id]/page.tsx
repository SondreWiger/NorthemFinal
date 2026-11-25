import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireMember } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import type { ChatChannel, ChatMessage, Profile } from '@northem/core/types';
import { ChatSidebar, channelTitle } from '../sidebar';
import { ChatRoom, type Author } from './room';
import { leaveChannel } from '../actions';

export const metadata: Metadata = { title: 'Chat' };

export default async function Channel(props: PageProps<'/chat/[id]'>) {
  const { id } = await props.params;
  const s = await requireMember(`/chat/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: ch } = await db.from('chat_channels').select('*').eq('id', id).maybeSingle();
  if (!ch) notFound();
  const channel = ch as ChatChannel;
  const [{ data: msgs }, { data: mem }, { data: org }] = await Promise.all([
    db.from('chat_messages').select('*').eq('channel_id', id).is('thread_root_id', null).order('created_at', { ascending: false }).limit(80),
    db.from('chat_members').select('user_id, last_read_at').eq('channel_id', id),
    db.from('org_members').select('user_id').eq('org_id', s.org.id).eq('status', 'active'),
  ]);
  const members = (mem as { user_id: string; last_read_at: string }[]) ?? [];
  const isMember = members.some((m) => m.user_id === s.userId);
  // Everyone who might post here, for names, avatars and @mentions.
  const ids = [...new Set([...((org as { user_id: string }[]) ?? []).map((o) => o.user_id), ...((msgs as ChatMessage[]) ?? []).map((m) => m.author_id ?? '')])].filter(Boolean);
  const { data: profs } = ids.length ? await db.from('profiles').select('id, display_name, avatar_url, handle').in('id', ids) : { data: [] };
  const authors: Record<string, Author> = Object.fromEntries(((profs as Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'handle'>[]) ?? []).map((p) => [p.id, { name: p.display_name || 'Someone', avatar: p.avatar_url, handle: p.handle }]));
  if (!isMember && (channel.kind === 'channel' || channel.kind === 'project')) {
    // Opening an open channel joins it, so unread counts and mentions work.
    await db.from('chat_members').upsert({ channel_id: id, user_id: s.userId }, { onConflict: 'channel_id,user_id', ignoreDuplicates: true });
  }
  const title = await channelTitle(channel, s.userId);
  const prefix = channel.kind === 'dm' ? '@' : channel.kind === 'group' ? '' : '#';
  return (
    <div className="chat">
      <ChatSidebar orgId={s.org.id} userId={s.userId} current={id} />
      <ChatRoom
        channelId={id}
        title={`${prefix}${title}`}
        topic={channel.topic ?? (channel.project_id ? 'Project channel' : channel.kind === 'dm' ? 'Direct message' : null)}
        projectId={channel.project_id}
        me={s.userId}
        initial={((msgs as ChatMessage[]) ?? []).reverse()}
        authors={authors}
        archived={Boolean(channel.archived_at)}
        headerExtra={
          channel.kind !== 'dm' ? (
            <form action={leaveChannel}>
              <input type="hidden" name="channel_id" value={id} />
              <button className="btn btn-ghost btn-sm">Leave</button>
            </form>
          ) : null
        }
      />
    </div>
  );
}
