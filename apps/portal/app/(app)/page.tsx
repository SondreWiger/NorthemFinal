import { requireMember } from '@northem/core/session';
import { env } from '@northem/core/env';
import { supabaseServer } from '@northem/core/supabase/server';
import { KIND_LABEL, STATUS_LABEL, timeAgo } from '@northem/core/format';
import { PROJECT_ROLE_LABEL } from '@northem/core/roles';
import type { ChatMessage, Notification } from '@northem/core/types';
import { Poster } from '@northem/ui/poster';
import { Empty, PageHeader, UserAvatar } from '@northem/ui/app';
import { myChannels, myProjects, profilesById, unreadCounts } from '@/data';

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/Oslo' }));
  return h < 5 ? 'Still up' : h < 11 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function Home() {
  const s = await requireMember('/');
  const db = await supabaseServer();
  const [{ mine, all, roles }, channels, counts, { data: notes }] = await Promise.all([
    myProjects(s.org.id, s.userId), myChannels(s.org.id), unreadCounts(),
    db.from('notifications').select('*').order('created_at', { ascending: false }).limit(6),
  ]);
  const channelIds = channels.slice(0, 30).map((c) => c.id);
  const { data: recent } = channelIds.length
    ? await db.from('chat_messages').select('*').in('channel_id', channelIds).is('deleted_at', null).order('created_at', { ascending: false }).limit(8)
    : { data: [] };
  const msgs = (recent as ChatMessage[]) ?? [];
  const people = await profilesById(msgs.map((m) => m.author_id ?? ''));
  const chName = new Map(channels.map((c) => [c.id, c]));
  const active = all.filter((p) => ['pre_production', 'production', 'post_production', 'building', 'beta'].includes(p.status));
  const first = (s.profile.display_name || '').split(' ')[0];

  return (
    <>
      <PageHeader title={`${greeting()}${first ? `, ${first}` : ''}.`} sub={`${active.length} project${active.length === 1 ? '' : 's'} in motion across ${s.org.name}.`}
        actions={s.can('projects.create') ? <a className="btn btn-primary" href={`${env.adminUrl}/projects/new`}>New project</a> : null} />

      {!s.profile.onboarded_at ? (
        <div className="notice" style={{ marginBottom: 20 }}>Your profile is empty. <a href="/me">Add a photo and a line about you</a> so people know who they&apos;re working with.</div>
      ) : null}

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card stat"><strong>{mine.length}</strong><span>your projects</span></div>
        <a className="card stat" href="/chat" style={{ textDecoration: 'none' }}><strong>{counts.chat}</strong><span>unread messages</span></a>
        <a className="card stat" href="/notifications" style={{ textDecoration: 'none' }}><strong>{counts.notifications}</strong><span>new notifications</span></a>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Your projects</h2><a className="small muted" href="/projects">All projects →</a></div>
          {mine.length ? (
            <div className="stack">
              {mine.slice(0, 6).map((p) => (
                <a key={p.id} href={`/projects/${p.id}`} className="proj-card">
                  <Poster title={p.title} seed={p.id} kind={p.kind} src={p.poster_url} />
                  <span style={{ minWidth: 0 }}>
                    <strong>{p.title}</strong>
                    <small>{KIND_LABEL[p.kind]} · {STATUS_LABEL[p.status]} · you&apos;re {PROJECT_ROLE_LABEL[roles.get(p.id)!.role].toLowerCase()}</small>
                  </span>
                </a>
              ))}
            </div>
          ) : <Empty title="No projects yet">When someone adds you to a project it shows up here.</Empty>}
        </section>

        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <div className="card-head"><h2>Latest in chat</h2><a className="small muted" href="/chat">Open chat →</a></div>
            {msgs.length ? (
              <ul className="list">
                {msgs.map((m) => {
                  const a = people.get(m.author_id ?? '');
                  const ch = chName.get(m.channel_id);
                  return (
                    <li key={m.id}>
                      <UserAvatar name={a?.display_name ?? '?'} src={a?.avatar_url} size={28} />
                      <a className="grow" href={`/chat/${m.channel_id}`} style={{ textDecoration: 'none' }}>
                        <strong className="small">{a?.display_name ?? 'Someone'} <span className="faint">in {ch?.kind === 'dm' ? 'a DM' : `#${ch?.name ?? 'channel'}`}</span></strong>
                        <small style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.body}</small>
                      </a>
                      <small className="faint">{timeAgo(m.created_at)}</small>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty title="Quiet in here">Say hi in a project channel.</Empty>}
          </section>

          <section className="card">
            <div className="card-head"><h2>Notifications</h2><a className="small muted" href="/notifications">All →</a></div>
            {(notes as Notification[] | null)?.length ? (
              <ul className="list">
                {(notes as Notification[]).map((n) => (
                  <li key={n.id}>
                    {!n.read_at ? <span className="dot" aria-label="New" /> : null}
                    <a className="grow" href={n.href ?? (n.data.project_id ? `/projects/${n.data.project_id}` : '/notifications')} style={{ textDecoration: 'none' }}>
                      <strong className="small">{n.title}</strong>{n.body ? <small>{n.body}</small> : null}
                    </a>
                    <small className="faint">{timeAgo(n.created_at)}</small>
                  </li>
                ))}
              </ul>
            ) : <Empty title="Nothing new" />}
          </section>
        </div>
      </div>
    </>
  );
}
