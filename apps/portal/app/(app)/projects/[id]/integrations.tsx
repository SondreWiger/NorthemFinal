import type { Project, ProjectLink } from '@northem/core/types';
import { supabaseServer } from '@northem/core/supabase/server';
import { IntegrationError, PROVIDERS, extractTodos, graphite, sps, type SpsScript } from '@northem/core/integrations';
import { PROJECT_ROLES } from '@northem/core/types';
import { PROJECT_ROLE_LABEL } from '@northem/core/roles';
import { dateLabel } from '@northem/core/format';
import { Empty, Notice, Submit } from '@northem/ui/app';
import { addLink } from './actions';

async function links(projectId: string, provider: string) {
  const db = await supabaseServer();
  const { data } = await db.from('project_links').select('*').eq('project_id', projectId).eq('provider', provider);
  return (data as ProjectLink[]) ?? [];
}

function NotConnected({ name }: { name: string }) {
  return <Empty title={`Connect your ${name} account`}>The portal reads {name} as you, so you only see what you can see there. <a href="/me#connections">Connect it in your profile</a>.</Empty>;
}

function LinkForm({ project, provider, tab, idLabel, help }: { project: Project; provider: string; tab: string; idLabel: string; help: string }) {
  return (
    <form action={addLink} className="form-grid">
      <input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="provider" value={provider} /><input type="hidden" name="tab" value={tab} />
      <div className="field"><label>{idLabel}</label><input name="external_id" required /><small>{help}</small></div>
      <div className="field"><label>Label</label><input name="label" placeholder="Shooting script" /></div>
      <div className="field"><label>Link (optional)</label><input name="external_url" type="url" /></div>
      <div className="field"><label>Visible to</label><select name="min_role" defaultValue="crew">{PROJECT_ROLES.map((r) => <option key={r} value={r}>{PROJECT_ROLE_LABEL[r]} and up</option>)}</select></div>
      <div className="wide"><Submit>Link</Submit></div>
    </form>
  );
}

/** Scripts from Screenplay Studio, read with the viewer's own token. */
export async function ScriptsTab({ project, userId, isLead }: { project: Project; userId: string; isLead: boolean }) {
  const linked = await links(project.id, 'screenplay_studio');
  let body: React.ReactNode;
  if (!linked.length) {
    body = <Empty title="No Screenplay Studio project linked">{isLead ? 'Link one below.' : 'Ask a project lead to link it.'}</Empty>;
  } else {
    try {
      const sections = await Promise.all(linked.map(async (l) => ({ l, scripts: await sps.scripts(userId, l.external_id) })));
      body = sections.some((x) => x.scripts === null) ? <NotConnected name="Screenplay Studio" /> : sections.map(({ l, scripts }) => (
        <section key={l.id} className="card">
          <div className="card-head"><h2>{l.label ?? 'Screenplay Studio'}</h2>{l.external_url ? <a className="small muted" href={l.external_url} target="_blank" rel="noreferrer">Open in Screenplay Studio ↗</a> : null}</div>
          {scripts && scripts.length ? (
            <ul className="list">
              {scripts.map((sc: SpsScript) => (
                <li key={sc.id}>
                  <span className="badge">{sc.revision_color ?? 'white'}</span>
                  <a className="grow" href={`/scripts/${sc.id}?project=${project.id}`} style={{ textDecoration: 'none' }}><strong>{sc.title}</strong><small>v{sc.version ?? 1}{sc.scenes ? ` · ${sc.scenes} scenes` : ''}{sc.updated_at ? ` · updated ${dateLabel(sc.updated_at)}` : ''}</small></a>
                </li>
              ))}
            </ul>
          ) : <Empty title="No scripts in this project yet" />}
        </section>
      ));
    } catch (e) {
      body = <Notice kind="bad">{e instanceof IntegrationError ? e.message : 'Screenplay Studio could not be reached right now.'}</Notice>;
    }
  }
  return (
    <div className="stack" style={{ gap: 16 }}>
      {body}
      {isLead ? <section className="card"><h2>Link a Screenplay Studio project</h2><LinkForm project={project} provider="screenplay_studio" tab="scripts" idLabel="Screenplay Studio project id" help="Open the project in Screenplay Studio; the id is in the address bar." /></section> : null}
    </div>
  );
}

/** To-do lists from Graphite pages or databases. */
export async function TasksTab({ project, userId, isLead }: { project: Project; userId: string; isLead: boolean }) {
  const linked = await links(project.id, 'graphite');
  let body: React.ReactNode;
  if (!linked.length) {
    body = <Empty title="No Graphite page linked">{isLead ? 'Link a to-do page or task database below.' : 'Ask a project lead to link one.'}</Empty>;
  } else {
    try {
      const pages = await Promise.all(linked.map(async (l) => {
        const page = await graphite.page(userId, l.external_id);
        if (page === null) return { l, page: null, todos: [], rows: [] as Record<string, unknown>[] };
        const isDb = typeof page === 'object' && page !== null && Boolean((page as { is_database?: boolean }).is_database);
        const rows = isDb ? (await graphite.query(userId, l.external_id)) : null;
        const rowList = Array.isArray(rows) ? rows : (rows && typeof rows === 'object' && Array.isArray((rows as { rows?: unknown[] }).rows) ? (rows as { rows: Record<string, unknown>[] }).rows : []);
        return { l, page, todos: extractTodos(page), rows: rowList as Record<string, unknown>[] };
      }));
      body = pages.some((x) => x.page === null) ? <NotConnected name="Graphite" /> : (
        <div className="kanban">
          {pages.map(({ l, todos, rows }) => {
            const done = todos.filter((t) => t.done).length;
            return (
              <section key={l.id} className="card">
                <div className="card-head"><h2>{l.label ?? 'Tasks'}</h2>{l.external_url ? <a className="small muted" href={l.external_url} target="_blank" rel="noreferrer">Open ↗</a> : null}</div>
                {todos.length ? (
                  <>
                    <div className="small muted" style={{ marginBottom: 6 }}>{done} of {todos.length} done</div>
                    <div style={{ height: 4, background: 'var(--panel-2)', borderRadius: 4, marginBottom: 10 }}><div style={{ width: `${(done / todos.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} /></div>
                    {todos.map((t, i) => <div key={i} className={`todo ${t.done ? 'done' : ''}`}><input type="checkbox" checked={t.done} readOnly aria-label={t.done ? 'Done' : 'Open'} /><span>{t.text}</span></div>)}
                  </>
                ) : rows.length ? (
                  <ul className="list">{rows.slice(0, 50).map((r, i) => <li key={i}><span className="grow">{String(r.title ?? r.Name ?? r.name ?? Object.values(r)[0] ?? '')}</span><small>{String(r.Status ?? r.status ?? '')}</small></li>)}</ul>
                ) : <Empty title="No to-dos found on this page" />}
              </section>
            );
          })}
        </div>
      );
    } catch (e) {
      body = <Notice kind="bad">{e instanceof IntegrationError ? e.message : 'Graphite could not be reached right now.'}</Notice>;
    }
  }
  return (
    <div className="stack" style={{ gap: 16 }}>
      {body}
      <p className="small faint">Tasks are edited in {PROVIDERS.graphite.name}; this view is read-only and refreshes each visit.</p>
      {isLead ? <section className="card"><h2>Link a Graphite page</h2><LinkForm project={project} provider="graphite" tab="tasks" idLabel="Graphite page id" help="A to-do page or a task database. Copy the id from the page's address." /></section> : null}
    </div>
  );
}
