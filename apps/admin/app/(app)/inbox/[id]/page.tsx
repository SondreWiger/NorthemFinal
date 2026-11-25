import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { FORM_LABEL, dateLabel, timeAgo } from '@northem/core/format';
import type { Profile, Submission } from '@northem/core/types';
import { ConfirmSubmit, Notice, PageHeader, Submit, UserAvatar } from '@northem/ui/app';
import { requireCan } from '@/guard';
import { addNote, remove, reply, setStatus } from '../actions';

export const metadata: Metadata = { title: 'Inbox item' };

const STATUSES = ['new', 'reviewing', 'shortlisted', 'replied', 'accepted', 'declined', 'spam', 'archived'];

function Value({ v }: { v: unknown }) {
  if (v == null || v === '') return <span className="faint">—</span>;
  if (Array.isArray(v)) return <>{v.map((x, i) => <span key={i} className="badge" style={{ marginRight: 4 }}>{String(x)}</span>)}</>;
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /^https?:\/\//.test(t) ? <a href={t} target="_blank" rel="noreferrer">{t}</a> : <span style={{ whiteSpace: 'pre-wrap' }}>{t}</span>;
}

export default async function InboxItem(props: PageProps<'/inbox/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const s = await requireCan('forms.read', `/inbox/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data } = await db.from('submissions').select('*, division:divisions(name), opening:openings(title, kind)').eq('id', id).maybeSingle();
  if (!data) notFound();
  const sub = data as Submission & { division: { name: string } | null; opening: { title: string; kind: string } | null };
  if (sub.status === 'new' && s.can('forms.manage')) await db.from('submissions').update({ status: 'reviewing' }).eq('id', id);
  const [{ data: notes }, { data: team }] = await Promise.all([
    db.from('submission_notes').select('*').eq('submission_id', id).order('created_at'),
    db.from('org_members').select('user_id').eq('org_id', s.org.id).eq('status', 'active').in('role', ['producer', 'admin', 'owner', 'crew']),
  ]);
  const ids = [...new Set([...(((notes as { author_id: string | null }[]) ?? []).map((n) => n.author_id ?? '')), ...(((team as { user_id: string }[]) ?? []).map((t) => t.user_id))])].filter(Boolean);
  const { data: profs } = ids.length ? await db.from('profiles').select('id, display_name, avatar_url').in('id', ids) : { data: [] };
  const who = new Map(((profs as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]) ?? []).map((p) => [p.id, p]));
  const files = sub.attachments ?? [];
  return (
    <>
      <PageHeader crumbs={[{ href: '/inbox', label: 'Inbox' }]} title={sub.name || sub.email}
        sub={`${FORM_LABEL[sub.form]}${sub.opening ? ` for “${sub.opening.title}”` : ''} · ${sub.division?.name ?? sub.source_host ?? 'site'} · ${dateLabel(sub.created_at)}`}
        actions={s.can('forms.manage') ? <form action={remove}><input type="hidden" name="id" value={id} /><ConfirmSubmit className="btn btn-ghost btn-sm" confirm="Delete for good?">Delete</ConfirmSubmit></form> : null} />
      {typeof sp.msg === 'string' ? <Notice kind={/sent|saved/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2">
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <h2>{sub.subject || 'Message'}</h2>
            <p className="small"><a href={`mailto:${sub.email}`}>{sub.email}</a>{sub.phone ? <> · <a href={`tel:${sub.phone}`}>{sub.phone}</a></> : null}</p>
            {sub.message ? <p style={{ whiteSpace: 'pre-wrap' }}>{sub.message}</p> : null}
            {Object.keys(sub.payload ?? {}).length ? (
              <table className="table" style={{ marginTop: 12 }}><tbody>
                {Object.entries(sub.payload).map(([k, v]) => <tr key={k}><th style={{ width: '35%' }}>{k.replace(/_/g, ' ')}</th><td><Value v={v} /></td></tr>)}
              </tbody></table>
            ) : null}
            {files.length ? <p className="small">{files.map((f) => <a key={f} className="btn btn-sm" style={{ marginRight: 6 }} href={`/inbox/file?path=${encodeURIComponent(f)}`}>{f.split('/').pop()}</a>)}</p> : null}
          </section>
          {s.can('forms.manage') ? (
            <section className="card">
              <h2>Reply by mail</h2>
              <form action={reply} className="stack">
                <input type="hidden" name="id" value={id} />
                <div className="field"><label>Subject</label><input name="subject" defaultValue={`Re: ${sub.subject ?? FORM_LABEL[sub.form].toLowerCase()}`} /></div>
                <div className="field"><label>Message</label><textarea name="body" rows={7} defaultValue={`Hi ${(sub.name ?? '').split(' ')[0] || 'there'},\n\n\n\nBest,\n${s.profile.display_name || s.org.name}`} /></div>
                <small className="muted">Sent from {s.org.name}; replies come back to {s.email}.</small>
                <Submit pendingText="Sending…">Send reply</Submit>
              </form>
            </section>
          ) : null}
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <h2>Status</h2>
            <form action={setStatus} className="stack">
              <input type="hidden" name="id" value={id} />
              <div className="field"><label>Status</label><select name="status" defaultValue={sub.status === 'new' ? 'reviewing' : sub.status}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="field"><label>Assigned to</label>
                <select name="assigned_to" defaultValue={sub.assigned_to ?? ''}><option value="">Nobody</option>
                  {((team as { user_id: string }[]) ?? []).map((t) => <option key={t.user_id} value={t.user_id}>{who.get(t.user_id)?.display_name || 'Unnamed'}</option>)}
                </select>
              </div>
              <Submit>Save</Submit>
            </form>
          </section>
          <section className="card">
            <h2>Notes</h2>
            <ul className="list">
              {((notes as { id: string; author_id: string | null; body: string; created_at: string }[]) ?? []).map((n) => {
                const a = who.get(n.author_id ?? '');
                return (
                  <li key={n.id} style={{ alignItems: 'flex-start' }}>
                    <UserAvatar name={a?.display_name ?? '?'} src={a?.avatar_url} size={26} />
                    <span className="grow"><strong className="small">{a?.display_name ?? 'Someone'} <span className="faint">{timeAgo(n.created_at)}</span></strong><small style={{ whiteSpace: 'pre-wrap' }}>{n.body}</small></span>
                  </li>
                );
              })}
            </ul>
            <form action={addNote} className="stack" style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={id} />
              <textarea name="body" rows={3} placeholder="Only the team sees notes." />
              <Submit>Add note</Submit>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
