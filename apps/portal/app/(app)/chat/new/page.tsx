import type { Metadata } from 'next';
import { requireMember } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { ORG_ROLE_LABEL } from '@northem/core/roles';
import type { OrgRole, Profile } from '@northem/core/types';
import { Notice, PageHeader, Submit, UserAvatar } from '@northem/ui/app';
import { createChannel, openDm } from '../actions';

export const metadata: Metadata = { title: 'New conversation' };

export default async function NewChat(props: PageProps<'/chat/new'>) {
  const sp = await props.searchParams;
  const s = await requireMember('/chat/new');
  const db = await supabaseServer();
  const { data: mem } = await db.from('org_members').select('user_id, role, title').eq('org_id', s.org.id).eq('status', 'active');
  const rows = ((mem as { user_id: string; role: OrgRole; title: string | null }[]) ?? []).filter((m) => m.user_id !== s.userId);
  const { data: profs } = rows.length ? await db.from('profiles').select('id, display_name, avatar_url').in('id', rows.map((r) => r.user_id)) : { data: [] };
  const byId = new Map(((profs as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]) ?? []).map((p) => [p.id, p]));
  const people = rows.map((r) => ({ ...r, name: byId.get(r.user_id)?.display_name || 'Unnamed', avatar: byId.get(r.user_id)?.avatar_url ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const canChannel = s.can('chat.create_channel');
  return (
    <>
      <PageHeader title="New conversation" crumbs={[{ href: '/chat', label: 'Chat' }]} />
      {typeof sp.msg === 'string' ? <Notice kind="bad">{sp.msg}</Notice> : null}
      <div className="grid-2">
        <section className="card">
          <h2>Message someone</h2>
          {people.length ? (
            <ul className="list">
              {people.map((p) => (
                <li key={p.user_id}>
                  <UserAvatar name={p.name} src={p.avatar} size={30} />
                  <span className="grow"><strong className="small">{p.name}</strong><small>{p.title ?? ORG_ROLE_LABEL[p.role]}</small></span>
                  <form action={openDm}><input type="hidden" name="user_id" value={p.user_id} /><button className="btn btn-sm">Message</button></form>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Nobody else here yet.</p>}
        </section>
        <section className="card">
          <h2>{canChannel ? 'Start a channel or group' : 'Start a group'}</h2>
          <form action={createChannel} className="stack">
            {canChannel ? (
              <div className="field"><label>Type</label>
                <select name="kind" defaultValue="channel"><option value="channel">Channel (anyone on the team can join)</option><option value="group">Private group</option></select>
              </div>
            ) : <input type="hidden" name="kind" value="group" />}
            <div className="field"><label>Name</label><input name="name" placeholder="location-scouting" maxLength={60} /></div>
            <div className="field"><label>Topic</label><input name="topic" maxLength={300} /></div>
            {canChannel ? (
              <div className="field"><label>Who can see it</label>
                <select name="min_org_role" defaultValue="crew">{(['guest', 'press', 'cast', 'crew', 'producer'] as const).map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]} and up</option>)}</select>
              </div>
            ) : null}
            <div className="field"><label>Add people</label>
              <div className="stack" style={{ gap: 4, maxHeight: 220, overflow: 'auto' }}>
                {people.map((p) => <label key={p.user_id} className="check small"><input type="checkbox" name="members" value={p.user_id} />{p.name}</label>)}
              </div>
            </div>
            <Submit pendingText="Creating…">Create</Submit>
          </form>
        </section>
      </div>
    </>
  );
}
