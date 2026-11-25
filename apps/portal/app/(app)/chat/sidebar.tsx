import type { ChatChannel } from '@northem/core/types';
import { supabaseServer } from '@northem/core/supabase/server';
import { myChannels, profilesById, unreadCounts } from '@/data';

/** Channel list: projects, channels, groups and DMs, with unread counts. */
export async function ChatSidebar({ orgId, userId, current }: { orgId: string; userId: string; current?: string }) {
  const [channels, counts] = await Promise.all([myChannels(orgId), unreadCounts()]);
  const db = await supabaseServer();
  const dmIds = channels.filter((c) => c.kind === 'dm' || c.kind === 'group').map((c) => c.id);
  const { data: mem } = dmIds.length ? await db.from('chat_members').select('channel_id, user_id').in('channel_id', dmIds) : { data: [] };
  const members = (mem as { channel_id: string; user_id: string }[]) ?? [];
  const profiles = await profilesById(members.map((m) => m.user_id));
  const label = (c: ChatChannel) => {
    if (c.kind !== 'dm' && c.kind !== 'group') return c.name ?? 'channel';
    const others = members.filter((m) => m.channel_id === c.id && m.user_id !== userId).map((m) => profiles.get(m.user_id)?.display_name || 'Someone');
    return c.name || others.join(', ') || 'Just you';
  };
  const groups: [string, ChatChannel[]][] = [
    ['Projects', channels.filter((c) => c.kind === 'project')],
    ['Channels', channels.filter((c) => c.kind === 'channel')],
    ['Direct messages', channels.filter((c) => c.kind === 'dm' || c.kind === 'group')],
  ];
  return (
    <nav className="chat-list" aria-label="Conversations">
      <a href="/chat/new" className="btn btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'center' }}>+ New message</a>
      {groups.map(([title, list]) => list.length ? (
        <div key={title}>
          <h3>{title}</h3>
          {list.map((c) => {
            const n = counts.byChannel.get(c.id) ?? 0;
            return (
              <a key={c.id} href={`/chat/${c.id}`} aria-current={current === c.id ? 'page' : undefined} className={n ? 'unread' : undefined}>
                <span aria-hidden>{c.kind === 'dm' ? '@' : c.kind === 'group' ? '◎' : c.is_private ? '🔒' : '#'}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(c)}</span>
                {n ? <span className="badge badge-accent">{n}</span> : null}
              </a>
            );
          })}
        </div>
      ) : null)}
    </nav>
  );
}

export async function channelTitle(c: ChatChannel, userId: string) {
  if (c.kind !== 'dm' && c.kind !== 'group') return c.name ?? 'channel';
  if (c.name) return c.name;
  const db = await supabaseServer();
  const { data } = await db.from('chat_members').select('user_id').eq('channel_id', c.id);
  const ids = ((data as { user_id: string }[]) ?? []).map((m) => m.user_id).filter((u) => u !== userId);
  const p = await profilesById(ids);
  return ids.map((i) => p.get(i)?.display_name || 'Someone').join(', ') || 'Just you';
}
