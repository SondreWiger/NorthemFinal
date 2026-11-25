import type { Metadata } from 'next';
import { requireMember } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { timeAgo } from '@northem/core/format';
import type { Notification } from '@northem/core/types';
import { Empty, PageHeader } from '@northem/ui/app';
import { clearRead, markRead } from './actions';

export const metadata: Metadata = { title: 'Notifications' };

export default async function Notifications() {
  await requireMember('/notifications');
  const db = await supabaseServer();
  const { data } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  const notes = (data as Notification[]) ?? [];
  const unread = notes.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notifications" sub={unread ? `${unread} new` : 'All caught up.'}
        actions={<div className="row" style={{ gap: 6 }}>
          {unread ? <form action={markRead}><button className="btn btn-sm">Mark all read</button></form> : null}
          {notes.length > unread ? <form action={clearRead}><button className="btn btn-sm btn-ghost">Clear read</button></form> : null}
        </div>} />
      {notes.length ? (
        <section className="card">
          <ul className="list">
            {notes.map((n) => (
              <li key={n.id}>
                {!n.read_at ? <span className="dot" aria-label="New" /> : null}
                <a className="grow" href={n.href ?? (n.data.project_id ? `/projects/${n.data.project_id}` : '#')} style={{ textDecoration: 'none' }}>
                  <strong className="small">{n.title}</strong>{n.body ? <small>{n.body}</small> : null}
                </a>
                <small className="faint">{timeAgo(n.created_at)}</small>
                {!n.read_at ? <form action={markRead}><input type="hidden" name="id" value={n.id} /><button className="btn btn-sm btn-ghost" aria-label="Mark read">✓</button></form> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : <Empty title="Nothing here">Credits, new projects and mentions show up here.</Empty>}
    </>
  );
}
