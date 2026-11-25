import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@northem/core/session';
import { hasServiceRole } from '@northem/core/supabase/admin';
import { serverEnv } from '@northem/core/env';
import { ORG_ROLE_HINT, ORG_ROLE_LABEL } from '@northem/core/roles';
import { listConnections, PROVIDERS, type Provider } from '@northem/core/integrations';
import { dateLabel } from '@northem/core/format';
import { Notice, PageHeader, Submit, UserAvatar } from '@northem/ui/app';
import { connect, disconnect, saveProfile, setPassword } from './actions';

export const metadata: Metadata = { title: 'My profile' };

export default async function Me(props: PageProps<'/me'>) {
  const sp = await props.searchParams;
  const s = await getSession();
  if (!s) redirect('/login?next=/me');
  const p = s.profile;
  const conns = await listConnections(s.userId);
  const missingKeys = [!hasServiceRole() && 'SUPABASE_SERVICE_ROLE_KEY', !serverEnv().encKey && 'CONNECTIONS_ENC_KEY'].filter(Boolean) as string[];
  const canConnect = missingKeys.length === 0;
  const links = [...(p.links ?? []), { label: '', url: '' }, { label: '', url: '' }].slice(0, Math.max(3, (p.links?.length ?? 0) + 1));
  return (
    <>
      <PageHeader title="My profile" sub={s.role ? `${ORG_ROLE_LABEL[s.role]} at ${s.org.name}. ${ORG_ROLE_HINT[s.role]}` : 'You are not on a team yet. Ask someone to add you to a project.'} />
      {sp.reset ? <Notice>Choose a new password below.</Notice> : null}
      {sp.welcome ? <Notice kind="ok">Welcome aboard. Add a photo and a line about yourself so people know who they&apos;re working with.</Notice> : null}
      {typeof sp.msg === 'string' ? <Notice kind={/saved|connected/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2">
        <section className="card">
          <h2>Profile</h2>
          <form action={saveProfile} className="stack">
            <div className="row" style={{ gap: 14 }}>
              <UserAvatar name={p.display_name || s.email} src={p.avatar_url} size={64} />
              <div className="field" style={{ flex: 1 }}><label>Photo</label><input type="file" name="avatar" accept="image/*" /></div>
            </div>
            <div className="field"><label>Name</label><input name="display_name" defaultValue={p.display_name} required maxLength={80} /></div>
            <div className="field"><label>Handle</label><input name="handle" defaultValue={p.handle ?? ''} placeholder="sondre" maxLength={31} /><small>Used for @mentions in chat.</small></div>
            <div className="field"><label>Headline</label><input name="headline" defaultValue={p.headline ?? ''} placeholder="Director of photography, Oslo" maxLength={120} /></div>
            <div className="field"><label>Location</label><input name="location" defaultValue={p.location ?? ''} maxLength={80} /></div>
            <div className="field"><label>About you</label><textarea name="bio" rows={5} defaultValue={p.bio ?? ''} maxLength={2000} /></div>
            <div className="field"><label>Links</label>
              {links.map((l, i) => (
                <div key={i} className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <input name="link_label" defaultValue={l.label} placeholder="IMDb" style={{ width: 110 }} />
                  <input name="link_url" defaultValue={l.url} placeholder="https://" style={{ flex: 1 }} />
                </div>
              ))}
            </div>
            <label className="check"><input type="checkbox" name="is_public" defaultChecked={p.is_public} />Show my profile on the public sites when I&apos;m credited</label>
            <Submit pendingText="Saving…">Save profile</Submit>
          </form>
        </section>
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <h2>Connected tools</h2>
            <p className="muted small">Connect your own accounts so scripts and tasks show up on your projects. You only ever see what you can see there.</p>
            {!canConnect ? <Notice>This server can't see {missingKeys.join(' or ')} yet. Add it to this Vercel project for the environment you're on ({process.env.VERCEL_ENV ?? 'local'}), then redeploy.</Notice> : null}
            <div className="stack">
              {(Object.keys(PROVIDERS) as Provider[]).map((k) => {
                const c = conns.find((x) => x.provider === k);
                return (
                  <div key={k} className="block-row" style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <strong>{PROVIDERS[k].name}</strong>
                      {c ? <small className="muted" style={{ display: 'block' }}>Connected{c.external_user_label ? ` as ${c.external_user_label}` : ''} · {dateLabel(c.created_at)}</small>
                        : <small className="muted" style={{ display: 'block' }}>{PROVIDERS[k].tokenHelp}</small>}
                    </div>
                    {c ? (
                      <form action={disconnect}><input type="hidden" name="provider" value={k} /><button className="btn btn-sm btn-ghost">Disconnect</button></form>
                    ) : canConnect ? (
                      <form action={connect} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="provider" value={k} />
                        <input name="token" type="password" placeholder="Token" autoComplete="off" required style={{ width: 160 }} />
                        <Submit pendingText="Checking…">Connect</Submit>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card">
            <h2>Account</h2>
            <p className="small">Signed in as <strong>{s.email}</strong>.</p>
            <form action={setPassword} className="row" style={{ gap: 6 }}>
              <input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="New password" autoFocus={Boolean(sp.reset)} style={{ flex: 1 }} />
              <Submit pendingText="Saving…">Set password</Submit>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
