import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireMember } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { env, siteForDivisionSlug, siteUrl } from '@northem/core/env';
import { KIND_LABEL, STATUS_LABEL, dateLabel, timeAgo } from '@northem/core/format';
import { DEPARTMENTS, ORG_ROLE_LABEL, PROJECT_ROLE_LABEL, projectRoleAtLeast } from '@northem/core/roles';
import { publicFileUrl } from '@northem/core/queries';
import { PROJECT_ROLES, type DocumentRow, type Media, type Moment, type Person, type Project, type ProjectLink, type ProjectMember, type Trivia } from '@northem/core/types';
import { Poster } from '@northem/ui/poster';
import { MediaThumb } from '@northem/ui/public';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit, UserAvatar } from '@northem/ui/app';
import { profilesById, projectRole } from '@/data';
import * as A from './actions';
import { ScriptsTab, TasksTab } from './integrations';

export const metadata: Metadata = { title: 'Project' };

const TABS = [
  ['overview', 'Overview'], ['team', 'Team'], ['docs', 'Documents'], ['media', 'Photos & bloopers'], ['story', 'Trivia & diary'], ['scripts', 'Scripts'], ['tasks', 'Tasks'],
] as const;
type Tab = (typeof TABS)[number][0];

const DOC_CATEGORIES = ['script', 'sides', 'callsheet', 'schedule', 'budget', 'contract', 'spec', 'design', 'release', 'general'];

export default async function ProjectView(props: PageProps<'/projects/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const session = await requireMember(`/projects/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: p } = await db.from('projects').select('*, division:divisions(slug, name)').eq('id', id).maybeSingle();
  if (!p) notFound();
  const project = p as Project & { division: { slug: string; name: string } | null };
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? 'overview') as Tab;
  const msg = typeof sp.msg === 'string' ? sp.msg : null;
  const role = await projectRole(id);
  const isLead = projectRoleAtLeast(role, 'lead');
  const isHead = projectRoleAtLeast(role, 'head');
  const isCrew = projectRoleAtLeast(role, 'crew');

  const { data: membersRaw } = await db.from('project_members').select('*').eq('project_id', id);
  const members = (membersRaw as ProjectMember[]) ?? [];
  const profiles = await profilesById(members.map((m) => m.user_id));
  const { data: channel } = await db.from('chat_channels').select('id').eq('project_id', id).eq('kind', 'project').maybeSingle();
  const publicUrl = project.visibility !== 'private' && project.visibility !== 'internal' && project.published_at
    ? siteUrl(siteForDivisionSlug(project.division?.slug), siteForDivisionSlug(project.division?.slug) === 'landing' ? `/work/${project.slug}` : `/p/${project.slug}`) : null;

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/projects', label: 'Projects' }]}
        title={<span className="row" style={{ gap: 14 }}><span style={{ width: 44 }}><Poster title={project.title} seed={project.id} kind={project.kind} src={project.poster_url} /></span>{project.title}</span>}
        sub={`${project.division?.name ?? 'Northem'} · ${KIND_LABEL[project.kind]} · ${STATUS_LABEL[project.status]}${role ? ` · you're ${PROJECT_ROLE_LABEL[role].toLowerCase()}` : ''}`}
        actions={<>
          {channel ? <a className="btn" href={`/chat/${(channel as { id: string }).id}`}>Project chat</a> : null}
          {publicUrl ? <a className="btn" href={publicUrl} target="_blank" rel="noreferrer">Public page ↗</a> : null}
          {isLead ? <a className="btn btn-primary" href={`${env.adminUrl}/projects/${id}`}>Edit page & credits</a> : null}
        </>}
      />
      <nav className="tabs" aria-label="Project sections">
        {TABS.map(([k, label]) => <a key={k} href={`?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{label}</a>)}
      </nav>
      {msg ? <div style={{ marginBottom: 16 }}><Notice kind={/can't|fail|only|error|wrong|over/i.test(msg) ? 'bad' : 'ok'}>{msg}</Notice></div> : null}

      {tab === 'overview' ? <Overview project={project} members={members} profiles={profiles} isLead={isLead} /> : null}
      {tab === 'team' ? <Team project={project} members={members} profiles={profiles} isLead={isLead} orgRoleOptions={session.role} /> : null}
      {tab === 'docs' ? <Docs project={project} isHead={isHead} isLead={isLead} userId={session.userId} /> : null}
      {tab === 'media' ? <MediaTab project={project} isCrew={isCrew} isHead={isHead} userId={session.userId} /> : null}
      {tab === 'story' ? <Story project={project} isHead={isHead} canAdd={projectRoleAtLeast(role, 'cast')} userId={session.userId} /> : null}
      {tab === 'scripts' ? <ScriptsTab project={project} userId={session.userId} isLead={isLead} /> : null}
      {tab === 'tasks' ? <TasksTab project={project} userId={session.userId} isLead={isLead} /> : null}
    </>
  );
}

type Profiles = Awaited<ReturnType<typeof profilesById>>;

async function Overview({ project, members, profiles, isLead }: { project: Project; members: ProjectMember[]; profiles: Profiles; isLead: boolean }) {
  const db = await supabaseServer();
  const [{ data: docs }, { data: links }] = await Promise.all([
    db.from('documents').select('*').eq('project_id', project.id).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    db.from('project_links').select('*').eq('project_id', project.id),
  ]);
  return (
    <div className="grid-2">
      <div className="stack" style={{ gap: 16 }}>
        <section className="card">
          <h2>About</h2>
          {project.logline ? <p style={{ marginTop: 0, fontSize: 17 }}>{project.logline}</p> : null}
          {project.synopsis ? <p className="muted">{project.synopsis}</p> : <p className="muted">No synopsis yet.</p>}
          <div className="row small muted">
            {project.year ? <span>{project.year}</span> : null}
            {project.locations.length ? <span>· {project.locations.join(', ')}</span> : null}
            <span>· {project.visibility === 'public' && project.published_at ? 'Public page live' : `Visibility: ${project.visibility}`}</span>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h2>Documents</h2><a className="small muted" href="?tab=docs">All →</a></div>
          {(docs as DocumentRow[] | null)?.length ? <DocList docs={docs as DocumentRow[]} /> : <Empty title="No documents you can see yet" />}
        </section>
      </div>
      <div className="stack" style={{ gap: 16 }}>
        <section className="card">
          <div className="card-head"><h2>Team · {members.length}</h2><a className="small muted" href="?tab=team">Manage →</a></div>
          <ul className="list">
            {members.sort((a, b) => PROJECT_ROLES.indexOf(b.role) - PROJECT_ROLES.indexOf(a.role)).slice(0, 8).map((m) => {
              const pr = profiles.get(m.user_id);
              return <li key={m.user_id}><UserAvatar name={pr?.display_name ?? '?'} src={pr?.avatar_url} /><a className="grow" href={`/people/${m.user_id}`} style={{ textDecoration: 'none' }}><strong>{pr?.display_name || 'Unnamed'}</strong><small>{m.title ?? PROJECT_ROLE_LABEL[m.role]}</small></a></li>;
            })}
          </ul>
        </section>
        <section className="card">
          <h2>Linked tools</h2>
          {(links as ProjectLink[] | null)?.length ? (
            <ul className="list">
              {(links as ProjectLink[]).map((l) => (
                <li key={l.id}>
                  <span className="badge">{l.provider.replace('_', ' ')}</span>
                  <span className="grow">{l.external_url ? <a href={l.external_url} target="_blank" rel="noreferrer">{l.label ?? l.external_id}</a> : l.label ?? l.external_id}</span>
                  {isLead ? <form action={A.removeLink}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="link_id" value={l.id} /><ConfirmSubmit>Unlink</ConfirmSubmit></form> : null}
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Link the Screenplay Studio project or Graphite workspace from the Scripts and Tasks tabs.</p>}
        </section>
      </div>
    </div>
  );
}

function DocList({ docs, canDelete, projectId }: { docs: DocumentRow[]; canDelete?: (d: DocumentRow) => boolean; projectId?: string }) {
  return (
    <ul className="list">
      {docs.map((d) => (
        <li key={d.id}>
          <span className="badge">{d.category}</span>
          <a className="grow" href={d.source === 'upload' ? `/files/${d.id}` : d.url ?? '#'} target={d.source === 'upload' ? undefined : '_blank'} rel="noreferrer" style={{ textDecoration: 'none' }}>
            <strong>{d.pinned ? '📌 ' : ''}{d.title}</strong>
            <small>{PROJECT_ROLE_LABEL[d.min_role]} and up{d.departments.length ? ` · ${d.departments.join(', ')}` : ''} · {dateLabel(d.created_at)}</small>
          </a>
          {canDelete?.(d) && projectId ? (
            <form action={A.deleteDocument}><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="doc_id" value={d.id} /><ConfirmSubmit>Delete</ConfirmSubmit></form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

async function Team({ project, members, profiles, isLead, orgRoleOptions }: { project: Project; members: ProjectMember[]; profiles: Profiles; isLead: boolean; orgRoleOptions: string | null }) {
  const db = await supabaseServer();
  const { data: people } = await db.from('people').select('id, name, profile_id').eq('org_id', project.org_id).is('profile_id', null).order('name').limit(300);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Person</th><th>Role</th><th>Title</th><th>Departments</th>{isLead ? <th /> : null}</tr></thead>
          <tbody>
            {members.map((m) => {
              const pr = profiles.get(m.user_id);
              return isLead ? (
                <tr key={m.user_id}>
                  <td><div className="row"><UserAvatar name={pr?.display_name ?? '?'} src={pr?.avatar_url} size={28} /><a href={`/people/${m.user_id}`}>{pr?.display_name || 'Unnamed'}</a></div></td>
                  <td colSpan={3}>
                    <form action={A.updateMember} className="row" style={{ flexWrap: 'nowrap' }}>
                      <input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="user_id" value={m.user_id} />
                      <select className="input" name="role" defaultValue={m.role} style={{ width: 170 }}>{PROJECT_ROLES.map((r) => <option key={r} value={r}>{PROJECT_ROLE_LABEL[r]}</option>)}</select>
                      <input className="input" name="title" defaultValue={m.title ?? ''} placeholder="Title" style={{ width: 160 }} />
                      <input className="input" name="departments" defaultValue={m.departments.join(', ')} placeholder="Departments" style={{ width: 180 }} title="Comma separated" />
                      <Submit className="btn btn-sm">Save</Submit>
                    </form>
                  </td>
                  <td><form action={A.removeMember}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="user_id" value={m.user_id} /><ConfirmSubmit>Remove</ConfirmSubmit></form></td>
                </tr>
              ) : (
                <tr key={m.user_id}>
                  <td><div className="row"><UserAvatar name={pr?.display_name ?? '?'} src={pr?.avatar_url} size={28} /><a href={`/people/${m.user_id}`}>{pr?.display_name || 'Unnamed'}</a></div></td>
                  <td>{PROJECT_ROLE_LABEL[m.role]}</td><td>{m.title}</td><td className="muted">{m.departments.join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isLead ? (
        <section className="card">
          <h2>Add someone by email</h2>
          <p className="muted small" style={{ marginTop: -6 }}>If they already have an account they&apos;re added right away. If not, they get an invite to set up their profile.</p>
          <form action={A.addMember} className="form-grid">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="field"><label>Email</label><input name="email" type="email" required /></div>
            <div className="field"><label>Title</label><input name="title" placeholder="1st AC, Lead actor, Backend" /></div>
            <div className="field"><label>Project role</label>
              <select name="project_role" defaultValue="crew">{PROJECT_ROLES.map((r) => <option key={r} value={r}>{PROJECT_ROLE_LABEL[r]}</option>)}</select>
              <small>Cast see call sheets and sides; crew see their department; leads see everything.</small>
            </div>
            <div className="field"><label>Team role (if new)</label>
              <select name="org_role" defaultValue="crew">{(['guest', 'press', 'cast', 'crew', 'producer'] as const).filter((r) => orgRoleOptions === 'owner' || r !== orgRoleOptions).map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}</select>
            </div>
            <div className="field wide"><label>Departments</label>
              <div className="row">{DEPARTMENTS.map((d) => <label key={d} className="check small"><input type="checkbox" name="departments" value={d} />{d}</label>)}</div>
            </div>
            <div className="field"><label>Link to credited person</label>
              <select name="person_id" defaultValue=""><option value="">None</option>{((people as Pick<Person, 'id' | 'name'>[]) ?? []).map((pe) => <option key={pe.id} value={pe.id}>{pe.name}</option>)}</select>
              <small>Their account takes over this person&apos;s credits and profile page.</small>
            </div>
            <div className="field"><label>Personal note (in the mail)</label><input name="message" maxLength={600} /></div>
            <div className="wide"><Submit pendingText="Adding…">Add to project</Submit></div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

async function Docs({ project, isHead, isLead, userId }: { project: Project; isHead: boolean; isLead: boolean; userId: string }) {
  const db = await supabaseServer();
  const { data } = await db.from('documents').select('*').eq('project_id', project.id).order('pinned', { ascending: false }).order('created_at', { ascending: false });
  const docs = (data as (DocumentRow & { created_by: string | null })[]) ?? [];
  const groups = new Map<string, typeof docs>();
  for (const d of docs) groups.set(d.category, [...(groups.get(d.category) ?? []), d]);
  return (
    <div className="grid-2" style={{ gridTemplateColumns: isHead ? 'minmax(0,1.5fr) minmax(0,1fr)' : '1fr' }}>
      <section className="card">
        <h2>Documents you can see</h2>
        {docs.length ? [...groups.entries()].map(([cat, ds]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div className="label" style={{ margin: '8px 0 2px' }}>{cat}</div>
            <DocList docs={ds} projectId={project.id} canDelete={(d) => isLead || (isHead && (d as { created_by?: string | null }).created_by === userId)} />
          </div>
        )) : <Empty title="Nothing here for your role yet">Documents are shared by role and department.</Empty>}
      </section>
      {isHead ? (
        <section className="card">
          <h2>Add a document</h2>
          <form action={A.addDocument} className="stack">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="field"><label>File</label><input type="file" name="file" /></div>
            <div className="field"><label>…or a link</label><input name="url" type="url" placeholder="https://" /></div>
            <div className="field"><label>Title</label><input name="title" placeholder="Defaults to the file name" /></div>
            <div className="field"><label>Category</label><select name="category" defaultValue="general">{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label>Who can see it</label>
              <select name="min_role" defaultValue="crew">{PROJECT_ROLES.map((r) => <option key={r} value={r}>{PROJECT_ROLE_LABEL[r]} and up</option>)}</select>
            </div>
            <div className="field"><label>Only these departments (optional)</label>
              <div className="row">{DEPARTMENTS.map((d) => <label key={d} className="check small"><input type="checkbox" name="departments" value={d} />{d}</label>)}</div>
              <small>Leave empty for every department. Leads always see everything.</small>
            </div>
            <label className="check"><input type="checkbox" name="pinned" /> Pin to the top</label>
            <Submit pendingText="Uploading…">Add document</Submit>
          </form>
        </section>
      ) : null}
    </div>
  );
}

async function MediaTab({ project, isCrew, isHead, userId }: { project: Project; isCrew: boolean; isHead: boolean; userId: string }) {
  const db = await supabaseServer();
  const { data } = await db.from('media').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
  const media = (data as Media[]) ?? [];
  return (
    <div className="stack" style={{ gap: 16 }}>
      {isCrew ? (
        <section className="card">
          <h2>Add photos, BTS or bloopers</h2>
          <form action={A.addMedia} className="form-grid">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="field"><label>Photos or clips</label><input type="file" name="files" multiple accept="image/*,video/*" /></div>
            <div className="field"><label>…or a YouTube / Vimeo link</label><input type="url" name="url" /></div>
            <div className="field"><label>Kind</label><select name="kind" defaultValue="bts">{['bts', 'still', 'blooper', 'concept', 'poster', 'screenshot', 'video'].map((k) => <option key={k}>{k}</option>)}</select></div>
            <div className="field"><label>Caption</label><input name="caption" placeholder="Slate frozen to the clapper" /></div>
            <div className="field"><label>Where</label><input name="location" /></div>
            <div className="field"><label>When</label><input type="date" name="taken_at" /></div>
            <div className="field wide"><label>The story behind it</label><textarea name="story" placeholder="What happened right before this?" /></div>
            {isHead ? <label className="check wide"><input type="checkbox" name="is_public" /> Show on the public page</label> : <p className="small muted wide" style={{ margin: 0 }}>A head of department or lead picks what goes on the public page.</p>}
            <div className="wide"><Submit pendingText="Uploading…">Upload</Submit></div>
          </form>
        </section>
      ) : null}
      {media.length ? (
        <div className="grid-auto">
          {media.map((m) => {
            const url = m.external_url ?? publicFileUrl('public-media', m.storage_path);
            return (
              <div key={m.id} className="card" style={{ padding: 10 }}>
                <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: 6, background: 'var(--panel-2)', display: 'grid' }}><MediaThumb m={m} url={url} title={project.title} /></div>
                <div className="row" style={{ marginTop: 8 }}>
                  <span className={`badge ${m.kind === 'blooper' ? 'badge-warn' : ''}`}>{m.kind}</span>
                  {m.is_public ? <span className="badge badge-ok">Public</span> : <span className="badge">Internal</span>}
                </div>
                {m.caption ? <p className="small" style={{ margin: '6px 0 0' }}>{m.caption}</p> : null}
                <div className="row" style={{ marginTop: 8 }}>
                  {isHead ? (
                    <form action={A.toggleMediaPublic}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="media_id" value={m.id} /><input type="hidden" name="value" value={String(!m.is_public)} /><Submit className="btn btn-sm">{m.is_public ? 'Unpublish' : 'Publish'}</Submit></form>
                  ) : null}
                  {isHead || m.uploaded_by === userId ? (
                    <form action={A.deleteMedia}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="media_id" value={m.id} /><ConfirmSubmit>Delete</ConfirmSubmit></form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : <Empty title="No photos yet">Behind-the-scenes shots and bloopers make the public page come alive.</Empty>}
    </div>
  );
}

async function Story({ project, isHead, canAdd, userId }: { project: Project; isHead: boolean; canAdd: boolean; userId: string }) {
  const db = await supabaseServer();
  const [{ data: t }, { data: mo }] = await Promise.all([
    db.from('trivia').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
    db.from('moments').select('*').eq('project_id', project.id).order('happened_on', { ascending: false }),
  ]);
  const trivia = (t as (Trivia & { created_by: string | null; created_at: string })[]) ?? [];
  const moments = (mo as (Moment & { created_by: string | null })[]) ?? [];
  const del = (table: string, rowId: string) => (
    <form action={A.deleteStory}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="table" value={table} /><input type="hidden" name="row_id" value={rowId} /><ConfirmSubmit>Delete</ConfirmSubmit></form>
  );
  return (
    <div className="grid-2">
      <section className="card">
        <h2>Trivia, goofs & quotes</h2>
        {canAdd ? (
          <form action={A.addTrivia} className="stack" style={{ marginBottom: 16 }}>
            <input type="hidden" name="project_id" value={project.id} />
            <div className="row"><select className="input" name="kind" style={{ width: 'auto' }}>{['trivia', 'goof', 'quote', 'fun_fact', 'confession'].map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}</select>
              {isHead ? <label className="check small"><input type="checkbox" name="is_public" /> Public</label> : null}</div>
            <textarea className="input" name="body" required maxLength={1500} placeholder="The 'wolf' in the night scene was Emil in a down jacket." />
            <Submit>Add</Submit>
          </form>
        ) : null}
        {trivia.length ? <ul className="list">{trivia.map((x) => (
          <li key={x.id}><div className="grow"><span className="badge">{x.kind.replace('_', ' ')}</span> {x.is_public ? <span className="badge badge-ok">Public</span> : null}<p style={{ margin: '6px 0 0' }}>{x.body}</p></div>{isHead || x.created_by === userId ? del('trivia', x.id) : null}</li>
        ))}</ul> : <Empty title="No trivia yet" />}
      </section>
      <section className="card">
        <h2>Production diary</h2>
        {canAdd ? (
          <form action={A.addMoment} className="stack" style={{ marginBottom: 16 }}>
            <input type="hidden" name="project_id" value={project.id} />
            <div className="row"><input className="input" type="date" name="happened_on" style={{ width: 'auto' }} /><input className="input" name="mood" placeholder="🌬️" maxLength={8} style={{ width: 70 }} />
              {isHead ? <label className="check small"><input type="checkbox" name="is_public" /> Public</label> : null}</div>
            <input className="input" name="title" required placeholder="First attempt, turned back" />
            <textarea className="input" name="body" placeholder="What happened today?" />
            <Submit>Add entry</Submit>
          </form>
        ) : null}
        {moments.length ? <ul className="list">{moments.map((m) => (
          <li key={m.id}><div className="grow"><small className="mono">{dateLabel(m.happened_on)}</small> {m.is_public ? <span className="badge badge-ok">Public</span> : null}<strong>{m.mood} {m.title}</strong>{m.body ? <small>{m.body}</small> : null}</div>{isHead || m.created_by === userId ? del('moments', m.id) : null}</li>
        ))}</ul> : <Empty title="No diary entries yet" />}
        <p className="small faint" style={{ marginBottom: 0 }}>Last updated {moments[0] ? timeAgo(moments[0].happened_on) : 'never'}.</p>
      </section>
    </div>
  );
}
