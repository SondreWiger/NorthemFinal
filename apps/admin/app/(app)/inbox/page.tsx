import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { FORM_LABEL, timeAgo } from '@northem/core/format';
import { SUBMISSION_FORMS, type Submission } from '@northem/core/types';
import { Empty, Notice, PageHeader } from '@northem/ui/app';
import { requireCan } from '@/guard';

export const metadata: Metadata = { title: 'Inbox' };

const VIEWS = [['open', 'Open'], ['new', 'New'], ['shortlisted', 'Shortlisted'], ['replied', 'Replied'], ['archived', 'Archived'], ['spam', 'Spam'], ['all', 'All']] as const;
const STATUS_BADGE: Record<string, string> = { new: 'badge-accent', reviewing: 'badge-info', shortlisted: 'badge-warn', replied: 'badge-ok', accepted: 'badge-ok', declined: '', spam: 'badge-bad', archived: '' };

export default async function Inbox(props: PageProps<'/inbox'>) {
  const sp = await props.searchParams;
  const s = await requireCan('forms.read', '/inbox');
  const view = (VIEWS.find(([k]) => k === sp.view)?.[0] ?? 'open') as (typeof VIEWS)[number][0];
  const form = typeof sp.form === 'string' && (SUBMISSION_FORMS as readonly string[]).includes(sp.form) ? sp.form : '';
  const search = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : '';
  const db = await supabaseServer();
  let query = db.from('submissions').select('*, division:divisions(name), opening:openings(title)').eq('org_id', s.org.id).order('created_at', { ascending: false }).limit(200);
  if (view === 'open') query = query.in('status', ['new', 'reviewing', 'shortlisted']);
  else if (view !== 'all') query = query.eq('status', view);
  if (form) query = query.eq('form', form);
  if (typeof sp.opening === 'string' && /^[0-9a-f-]{36}$/i.test(sp.opening)) query = query.eq('opening_id', sp.opening);
  if (search) query = query.or(`name.ilike.%${search.replace(/[%,()]/g, '')}%,email.ilike.%${search.replace(/[%,()]/g, '')}%,message.ilike.%${search.replace(/[%,()]/g, '')}%`);
  const { data } = await query;
  const rows = (data as (Submission & { division: { name: string } | null; opening: { title: string } | null })[]) ?? [];
  return (
    <>
      <PageHeader title="Inbox" sub="Pitches, applications, casting tapes, press requests and plain hellos from every site." />
      {typeof sp.msg === 'string' ? <Notice kind="ok">{sp.msg}</Notice> : null}
      <nav className="tabs" style={{ marginBottom: 12 }}>
        {VIEWS.map(([k, l]) => <a key={k} href={`/inbox?view=${k}${form ? `&form=${form}` : ''}`} aria-current={view === k ? 'page' : undefined}>{l}</a>)}
      </nav>
      <form className="row" style={{ gap: 8, marginBottom: 16 }}>
        <input type="hidden" name="view" value={view} />
        <input className="input" name="q" defaultValue={search} placeholder="Search name, email, message" style={{ flex: 1, minWidth: 180 }} />
        <select className="input" name="form" defaultValue={form}><option value="">Every form</option>{SUBMISSION_FORMS.map((f) => <option key={f} value={f}>{FORM_LABEL[f]}</option>)}</select>
        <button className="btn">Filter</button>
      </form>
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>From</th><th>What</th><th>Where</th><th>Status</th><th>When</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><a href={`/inbox/${r.id}`}><strong>{r.name || r.email}</strong></a><br /><small className="muted">{r.email}</small></td>
                  <td><span className="badge">{FORM_LABEL[r.form]}</span> <small>{r.opening?.title ?? r.subject ?? (r.message ?? '').slice(0, 70)}</small></td>
                  <td><small className="muted">{r.division?.name ?? r.source_host ?? '—'}</small></td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] ?? ''}`}>{r.status}</span></td>
                  <td><small className="faint">{timeAgo(r.created_at)}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="Nothing here">When someone uses a form on any of the sites it lands in this list.</Empty>}
    </>
  );
}
