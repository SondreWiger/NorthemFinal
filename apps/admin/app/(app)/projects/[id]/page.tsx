import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { env, siteForDivisionSlug, siteUrl } from '@northem/core/env';
import { DEPARTMENTS, PROJECT_ROLE_LABEL } from '@northem/core/roles';
import { KIND_LABEL, STATUS_LABEL } from '@northem/core/format';
import { publicFileUrl } from '@northem/core/queries';
import { PROJECT_KINDS, PROJECT_ROLES, PROJECT_STATUSES, type CreditView, type Division, type Media, type Moment, type Person, type Profile, type Project, type ProjectLink, type Theme, type Trivia } from '@northem/core/types';
import { SITE_THEMES } from '@northem/ui/theme';
import { Poster } from '@northem/ui/poster';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireAdmin } from '@/guard';
import * as A from '../actions';
import { PageBuilder } from './page-builder';

export const metadata: Metadata = { title: 'Project' };

const TABS = [['details', 'Details'], ['page', 'Public page'], ['credits', 'Credits'], ['public', 'Photos, bloopers & trivia'], ['links', 'Linked tools']] as const;
type Tab = (typeof TABS)[number][0];

export default async function ProjectAdmin(props: PageProps<'/projects/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const s = await requireAdmin(`/projects/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: p } = await db.from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const project = p as Project;
  const { data: role } = await db.rpc('my_project_role_rpc', { p_project: id });
  const isLead = role === 'lead';
  const tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? 'details') as Tab;
  const msg = typeof sp.msg === 'string' ? sp.msg : null;
  const { data: ds } = await db.from('divisions').select('*').eq('org_id', s.org.id).order('sort');
  const divisions = (ds as Division[]) ?? [];
  const division = divisions.find((d) => d.id === project.division_id);
  const site = siteForDivisionSlug(division?.slug);
  const live = (project.visibility === 'public' || project.visibility === 'unlisted') && project.published_at;
  const publicUrl = siteUrl(site, site === 'landing' ? `/work/${project.slug}` : `/p/${project.slug}`);

  return (
    <>
      <PageHeader crumbs={[{ href: '/projects', label: 'Projects' }]} title={project.title}
        sub={`${KIND_LABEL[project.kind]} · ${STATUS_LABEL[project.status]} · ${division?.name ?? 'no division'} · ${live ? 'public page is live' : 'not public'}`}
        actions={<div className="row" style={{ gap: 6 }}>
          <a className="btn btn-sm" href={`${env.portalUrl}/projects/${id}`}>Open in portal</a>
          <a className="btn btn-sm" href={`/preview/${id}`} target="_blank" rel="noreferrer">Preview page</a>
          {live ? <a className="btn btn-sm btn-primary" href={publicUrl} target="_blank" rel="noreferrer">View live ↗</a> : null}
        </div>} />
      {!isLead ? <Notice>You can look, but only this project&apos;s leads (and admins) can change it.</Notice> : null}
      {msg ? <Notice kind={/saved|added|credited|linked|created|updated|removed|unlinked/i.test(msg) ? 'ok' : 'bad'}>{msg}</Notice> : null}
      <nav className="tabs">{TABS.map(([k, l]) => <a key={k} href={`/projects/${id}?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{l}</a>)}</nav>
      {tab === 'details' ? <Details project={project} divisions={divisions} canDelete={s.atLeast('admin') || s.can('projects.manage_all')} />
        : tab === 'page' ? <PageTab project={project} site={site} orgId={s.org.id} />
          : tab === 'credits' ? <Credits project={project} orgId={s.org.id} />
            : tab === 'public' ? <PublicTab project={project} />
              : <Links project={project} />}
    </>
  );
}

function Details({ project: p, divisions, canDelete }: { project: Project; divisions: Division[]; canDelete: boolean }) {
  const stats = Object.entries(p.stats ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  return (
    <div className="grid-2">
      <section className="card">
        <form action={A.saveDetails} className="form-grid">
          <input type="hidden" name="id" value={p.id} />
          <div className="field wide"><label>Title</label><input name="title" defaultValue={p.title} required /></div>
          <div className="field"><label>Web address</label><input name="slug" defaultValue={p.slug} /></div>
          <div className="field"><label>Division</label><select name="division_id" defaultValue={p.division_id ?? ''}><option value="">None</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="field"><label>Kind</label><select name="kind" defaultValue={p.kind}>{PROJECT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
          <div className="field"><label>Status</label><select name="status" defaultValue={p.status}>{PROJECT_STATUSES.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</select></div>
          <div className="field wide"><label>Logline</label><input name="logline" defaultValue={p.logline ?? ''} maxLength={300} /></div>
          <div className="field wide"><label>Synopsis</label><textarea name="synopsis" rows={6} defaultValue={p.synopsis ?? ''} /></div>
          <div className="field"><label>Year</label><input name="year" type="number" defaultValue={p.year ?? ''} /></div>
          <div className="field"><label>Release date</label><input name="release_date" type="date" defaultValue={p.release_date ?? ''} /></div>
          <div className="field"><label>Runtime (minutes)</label><input name="runtime_minutes" type="number" defaultValue={p.runtime_minutes ?? ''} /></div>
          <div className="field"><label>Client</label><input name="client" defaultValue={p.client ?? ''} /></div>
          <div className="field"><label>Locations</label><input name="locations" defaultValue={p.locations.join(', ')} placeholder="Svalbard, Tromsø" /></div>
          <div className="field"><label>Genres / tags</label><input name="genres" defaultValue={p.genres.join(', ')} /></div>
          <div className="field wide"><label>Trailer link</label><input name="trailer_url" defaultValue={p.trailer_url ?? ''} placeholder="https://youtube.com/…" /></div>
          <div className="field wide"><label>Fun numbers (one per line, label: value)</label><textarea name="stats" rows={4} defaultValue={stats} placeholder={'Coldest day: -31°C\nTakes on the final shot: 14'} /></div>
          <div className="field"><label>Poster</label><input type="file" name="poster" accept="image/*" />{p.poster_url ? <label className="check small"><input type="checkbox" name="clear_poster" />Remove current (use generated art)</label> : <small>Empty uses generated art.</small>}</div>
          <div className="field"><label>Cover / backdrop</label><input type="file" name="cover" accept="image/*" /></div>
          <div className="field"><label>Who can see the project</label>
            <select name="visibility" defaultValue={p.visibility}>
              <option value="private">Private: project members only</option><option value="internal">Internal: the whole team</option>
              <option value="unlisted">Unlisted: public page, not in lists</option><option value="public">Public: on the site</option>
            </select>
          </div>
          <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" name="published" defaultChecked={Boolean(p.published_at)} />Publish the public page</label></div>
          <div className="wide"><Submit>Save details</Submit></div>
        </form>
      </section>
      <div className="stack" style={{ gap: 16 }}>
        <section className="card" style={{ maxWidth: 280 }}><Poster title={p.title} seed={p.id} kind={p.kind} src={p.poster_url} year={p.year} /></section>
        <section className="card">
          <h2>Team</h2>
          <p className="small muted">Add crew and cast, set who sees which documents, and send invites from the project&apos;s Team tab in the portal.</p>
          <a className="btn btn-sm" href={`${env.portalUrl}/projects/${p.id}?tab=team`}>Manage team in portal</a>
        </section>
        {canDelete ? (
          <section className="card">
            <h2>Delete project</h2>
            <p className="small muted">Removes documents, media, credits, chat and the public page. There is no undo.</p>
            <form action={A.deleteProject} className="row" style={{ gap: 6 }}>
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="title" value={p.title} />
              <input name="confirm" placeholder={`Type “${p.title}”`} style={{ flex: 1 }} />
              <ConfirmSubmit>Delete</ConfirmSubmit>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}

async function PageTab({ project: p, site, orgId }: { project: Project; site: keyof typeof SITE_THEMES; orgId: string }) {
  const db = await supabaseServer();
  const { data } = await db.from('themes').select('*').eq('org_id', orgId).order('name');
  const themes = (data as Theme[]) ?? [];
  const own = themes.find((t) => t.id === p.theme_id);
  return (
    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)' }}>
      <section className="card">
        <h2>Build the page</h2>
        <p className="small muted" style={{ marginTop: -6 }}>Starts from the {site === 'landing' ? 'main' : site} site&apos;s look. Change only what makes this project its own.</p>
        <form action={A.savePage} className="stack" style={{ gap: 16 }}>
          <input type="hidden" name="id" value={p.id} />
          <div className="field"><label>Base theme</label>
            <select name="theme_id" defaultValue={p.theme_id ?? ''}><option value="">None (site look + the settings below)</option>{themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <small>Themes are reusable looks. Settings below win over the theme.</small>
          </div>
          <PageBuilder initialTokens={p.theme_overrides ?? {}} initialBlocks={p.page_blocks ?? []} siteDefaults={{ ...SITE_THEMES[site], ...(own?.tokens ?? {}) }} />
          <details>
            <summary className="small">Hand-written CSS (advanced)</summary>
            <textarea name="custom_css" rows={8} defaultValue={own?.custom_css ?? ''} spellCheck={false} style={{ fontFamily: 'var(--font-mono)', marginTop: 8 }}
              placeholder={'.nm-project-head h1 { letter-spacing: .2em; }\n.nm-block > h2 { color: var(--accent-2); }'} />
            <small className="muted">Scoped to this page. Images and imports are stripped. {own && !own.name.endsWith('(own)') ? `This edits the shared theme “${own.name}”.` : ''}</small>
          </details>
          <div className="row" style={{ gap: 8 }}>
            <label className="check small"><input type="checkbox" name="save_as_theme" />Also save as a reusable theme named</label>
            <input name="theme_name" placeholder={`${p.title} look`} style={{ flex: 1, minWidth: 140 }} />
          </div>
          <Submit>Save page</Submit>
        </form>
      </section>
      <section className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 16, alignSelf: 'start' }}>
        <div className="card-head" style={{ padding: '10px 14px' }}><strong className="small">Preview (saved version)</strong><a className="small" href={`/preview/${p.id}`} target="_blank" rel="noreferrer">Open full ↗</a></div>
        <iframe className="preview-frame" src={`/preview/${p.id}`} title="Page preview" style={{ width: '100%', height: '78vh', border: 0, display: 'block' }} />
      </section>
    </div>
  );
}

async function Credits({ project: p, orgId }: { project: Project; orgId: string }) {
  const db = await supabaseServer();
  const [{ data: cr }, { data: ppl }, { data: mem }] = await Promise.all([
    db.from('credits').select('*, person:people(id, slug, name, photo_url, known_for, profile_id)').eq('project_id', p.id).order('billing'),
    db.from('people').select('id, name, known_for, profile_id').eq('org_id', orgId).order('name').limit(1000),
    db.from('org_members').select('user_id').eq('org_id', orgId).eq('status', 'active'),
  ]);
  const credits = (cr as CreditView[]) ?? [];
  const people = (ppl as Pick<Person, 'id' | 'name' | 'known_for' | 'profile_id'>[]) ?? [];
  const linked = new Set(people.map((x) => x.profile_id).filter(Boolean));
  const memberIds = ((mem as { user_id: string }[]) ?? []).map((m) => m.user_id).filter((u) => !linked.has(u));
  const { data: profs } = memberIds.length ? await db.from('profiles').select('id, display_name').in('id', memberIds) : { data: [] };
  const members = ((profs as Pick<Profile, 'id' | 'display_name'>[]) ?? []).sort((a, b) => a.display_name.localeCompare(b.display_name));
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <h2>Credit someone</h2>
        <p className="small muted" style={{ marginTop: -6 }}>Credits show on the public page and link to the person&apos;s page with everything else they&apos;ve done. Team members get a notification.</p>
        <form action={A.addCredit} className="form-grid">
          <input type="hidden" name="id" value={p.id} />
          <div className="field"><label>Already credited before</label>
            <select name="person_id" defaultValue=""><option value="">—</option>{people.map((x) => <option key={x.id} value={x.id}>{x.name}{x.known_for ? ` · ${x.known_for}` : ''}{x.profile_id ? ' ●' : ''}</option>)}</select>
            <small>● has a team profile</small>
          </div>
          <div className="field"><label>…or a team member</label>
            <select name="member_id" defaultValue=""><option value="">—</option>{members.map((m) => <option key={m.id} value={m.id}>{m.display_name || 'Unnamed'}</option>)}</select>
          </div>
          <div className="field"><label>…or someone new</label><input name="new_name" placeholder="Full name" /></div>
          <div className="field"><label>Job</label><input name="job" required placeholder="Director of photography" /></div>
          <div className="field"><label>Department</label><select name="department" defaultValue="camera">{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div className="field"><label>Character (cast)</label><input name="character_name" /></div>
          <div className="field"><label>Order</label><input name="billing" type="number" defaultValue={100} /><small>Lower comes first.</small></div>
          <div className="field"><label>Note</label><input name="note" placeholder="uncredited, episodes 1–3…" /></div>
          <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" name="is_public" defaultChecked />Show on the public page</label></div>
          <div className="wide"><Submit>Add credit</Submit></div>
        </form>
      </section>
      <section className="card">
        <h2>Credits ({credits.length})</h2>
        {credits.length ? (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Person</th><th>Job</th><th>Department</th><th>Character</th><th>Order</th><th>Public</th><th /></tr></thead>
            <tbody>
              {credits.map((c) => {
                const f = `c-${c.id}`;
                return (
                  <tr key={c.id}>
                    <td><a href={`/credits/${c.person.id}`}>{c.person.name}</a>{c.person.profile_id ? ' ●' : ''}</td>
                    <td><input form={f} name="job" defaultValue={c.job} /></td>
                    <td><select form={f} name="department" defaultValue={c.department}>{[...new Set([...DEPARTMENTS, c.department])].map((d) => <option key={d}>{d}</option>)}</select></td>
                    <td><input form={f} name="character_name" defaultValue={c.character_name ?? ''} /></td>
                    <td><input form={f} name="billing" type="number" defaultValue={c.billing} style={{ width: 70 }} /></td>
                    <td><input form={f} type="checkbox" name="is_public" defaultChecked={c.is_public} aria-label="Public" /></td>
                    <td><form id={f} action={A.updateCredit} className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="credit_id" value={c.id} />
                      <Submit className="btn btn-sm">Save</Submit>
                      <button className="btn btn-sm btn-ghost" name="delete" value="1" aria-label="Remove credit">✕</button>
                    </form></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : <Empty title="No credits yet" />}
      </section>
    </div>
  );
}

async function PublicTab({ project: p }: { project: Project }) {
  const db = await supabaseServer();
  const [{ data: m }, { data: t }, { data: mo }] = await Promise.all([
    db.from('media').select('*').eq('project_id', p.id).order('created_at', { ascending: false }).limit(200),
    db.from('trivia').select('*').eq('project_id', p.id).order('created_at', { ascending: false }),
    db.from('moments').select('*').eq('project_id', p.id).order('happened_on', { ascending: false }),
  ]);
  const media = (m as Media[]) ?? [];
  const trivia = (t as Trivia[]) ?? [];
  const moments = (mo as Moment[]) ?? [];
  const Toggle = ({ table, row, on }: { table: string; row: string; on: boolean }) => (
    <form action={A.togglePublic} className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="table" value={table} /><input type="hidden" name="row_id" value={row} />
      <button className={`btn btn-sm ${on ? 'btn-primary' : ''}`} name="value" value={on ? 'false' : 'true'}>{on ? 'Public' : 'Internal'}</button>
      <button className="btn btn-sm btn-ghost" name="delete" value="1" aria-label="Delete">✕</button>
    </form>
  );
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="muted small">The crew adds photos, bloopers, trivia and diary entries from the portal. Here you pick what the world gets to see.</p>
      <div className="grid-2">
        <section className="card">
          <h2>Add photos, BTS or bloopers</h2>
          <form action={A.addPublicMedia} className="stack">
            <input type="hidden" name="id" value={p.id} />
            <input type="file" name="files" multiple accept="image/*,video/*" />
            <input name="url" placeholder="…or a YouTube / Vimeo link" />
            <div className="row" style={{ gap: 6 }}>
              <select name="kind" defaultValue="bts">{['still', 'bts', 'blooper', 'concept', 'poster', 'screenshot'].map((k) => <option key={k}>{k}</option>)}</select>
              <input name="caption" placeholder="Caption" style={{ flex: 1 }} />
            </div>
            <textarea name="story" rows={2} placeholder="What happened here (optional)" />
            <label className="check small"><input type="checkbox" name="is_public" defaultChecked />Public right away</label>
            <Submit pendingText="Uploading…">Add</Submit>
          </form>
        </section>
        <section className="card">
          <h2>Add trivia</h2>
          <form action={A.addTrivia} className="stack">
            <input type="hidden" name="id" value={p.id} />
            <select name="kind" defaultValue="trivia">{['trivia', 'goof', 'quote', 'fun_fact', 'confession'].map((k) => <option key={k}>{k}</option>)}</select>
            <textarea name="body" rows={3} required placeholder="The drone battery froze at -28 and we shot the ending on a phone." />
            <label className="check small"><input type="checkbox" name="is_public" defaultChecked />Public right away</label>
            <Submit>Add</Submit>
          </form>
        </section>
      </div>
      <section className="card">
        <h2>Media ({media.length})</h2>
        {media.length ? (
          <div className="grid-auto">
            {media.map((x) => {
              const src = x.storage_path ? publicFileUrl('public-media', x.storage_path) : null;
              return (
                <div key={x.id} className="stack" style={{ gap: 6 }}>
                  {src && !x.kind.match(/video|audio/) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={x.caption ?? ''} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6 }} />
                  ) : <div className="empty" style={{ aspectRatio: '4/3', padding: 8 }}><strong>{x.kind}</strong><small>{x.external_url ?? x.storage_path}</small></div>}
                  <small><span className="badge">{x.kind}</span> {x.caption}</small>
                  <Toggle table="media" row={x.id} on={x.is_public} />
                </div>
              );
            })}
          </div>
        ) : <Empty title="No media yet" />}
      </section>
      <div className="grid-2">
        <section className="card">
          <h2>Trivia ({trivia.length})</h2>
          <ul className="list">{trivia.map((x) => <li key={x.id}><span className="badge">{x.kind}</span><span className="grow small">{x.body}</span><Toggle table="trivia" row={x.id} on={x.is_public} /></li>)}</ul>
        </section>
        <section className="card">
          <h2>Diary ({moments.length})</h2>
          <ul className="list">{moments.map((x) => <li key={x.id}><span>{x.mood ?? '•'}</span><span className="grow"><strong className="small">{x.title}</strong><small>{x.happened_on}</small></span><Toggle table="moments" row={x.id} on={x.is_public} /></li>)}</ul>
        </section>
      </div>
    </div>
  );
}

async function Links({ project: p }: { project: Project }) {
  const db = await supabaseServer();
  const { data } = await db.from('project_links').select('*').eq('project_id', p.id).order('created_at');
  const links = (data as ProjectLink[]) ?? [];
  const NAMES: Record<string, string> = { screenplay_studio: 'Screenplay Studio', graphite: 'Graphite', castingcall: 'CastingCall', cinderra: 'Cinderra', github: 'GitHub', other: 'Other' };
  return (
    <div className="grid-2">
      <section className="card">
        <h2>Linked tools</h2>
        {links.length ? (
          <ul className="list">
            {links.map((l) => (
              <li key={l.id}>
                <span className="badge">{NAMES[l.provider] ?? l.provider}</span>
                <span className="grow"><strong className="small">{l.label ?? l.external_id}</strong><small>{PROJECT_ROLE_LABEL[l.min_role]} and up · <code>{l.external_id}</code></small></span>
                <form action={A.saveLink}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="link_id" value={l.id} /><button className="btn btn-sm btn-ghost" name="delete" value="1">Unlink</button></form>
              </li>
            ))}
          </ul>
        ) : <Empty title="Nothing linked">Link the Screenplay Studio project to show scripts, or a Graphite page to show tasks.</Empty>}
      </section>
      <section className="card">
        <h2>Link a tool</h2>
        <form action={A.saveLink} className="stack">
          <input type="hidden" name="id" value={p.id} />
          <div className="field"><label>Tool</label><select name="provider" defaultValue="screenplay_studio">{Object.entries(NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field"><label>Id in that tool</label><input name="external" required placeholder="Project id, page id or repo (owner/name)" /></div>
          <div className="field"><label>Label</label><input name="label" placeholder="Shooting script, Sprint board" /></div>
          <div className="field"><label>Link (optional)</label><input name="external_url" placeholder="https://" /></div>
          <div className="field"><label>Who sees it</label><select name="min_role" defaultValue="crew">{PROJECT_ROLES.map((r) => <option key={r} value={r}>{PROJECT_ROLE_LABEL[r]} and up</option>)}</select></div>
          <Submit>Link</Submit>
        </form>
      </section>
    </div>
  );
}
