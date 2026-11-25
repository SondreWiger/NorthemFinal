import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import type { Division } from '@northem/core/types';
import { Notice, PageHeader, Submit } from '@northem/ui/app';
import { NorthemMark } from '@northem/ui/micro';
import { requireAdmin } from '@/guard';
import { saveBranding, saveDivision, saveDomain } from './actions';

export const metadata: Metadata = { title: 'Divisions & branding' };

export default async function Settings(props: PageProps<'/settings'>) {
  const sp = await props.searchParams;
  const s = await requireAdmin('/settings');
  const db = await supabaseServer();
  const [{ data: ds }, { data: doms }] = await Promise.all([
    db.from('divisions').select('*').eq('org_id', s.org.id).order('sort'),
    db.from('org_domains').select('*').eq('org_id', s.org.id).order('host'),
  ]);
  const divisions = (ds as Division[]) ?? [];
  const domains = (doms as { host: string; app: string; division_id: string | null }[]) ?? [];
  const b = s.org.branding ?? {};
  const canDivisions = s.can('sites.edit');
  return (
    <>
      <PageHeader title="Divisions & branding" sub="How the organisation presents itself: names, colours, logo, and which domain shows what. This is also where another production house would make the platform their own." />
      {typeof sp.msg === 'string' ? <Notice kind={/saved|removed/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2">
        <section className="card">
          <h2>Portal & admin branding</h2>
          {s.atLeast('admin') ? (
            <form action={saveBranding} className="stack">
              <div className="row" style={{ gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span style={{ width: 48, height: 48, display: 'grid', placeItems: 'center' }}>{b.logo_url ? <img src={b.logo_url} alt="" style={{ maxWidth: 48, maxHeight: 48 }} /> : <NorthemMark />}</span>
                <div className="field" style={{ flex: 1 }}><label>Logo</label><input type="file" name="logo" accept="image/*" />{b.logo_url ? <label className="check small"><input type="checkbox" name="clear_logo" />Use the default mark</label> : null}</div>
              </div>
              <div className="field"><label>Organisation name</label><input name="name" defaultValue={s.org.name} /></div>
              <div className="field"><label>Portal name</label><input name="product_name" defaultValue={b.product_name ?? ''} placeholder={`${s.org.name} Portal`} /></div>
              <div className="field"><label>Accent colour</label>
                <div className="row" style={{ gap: 8 }}><input type="color" name="accent" defaultValue={b.accent ?? '#ff5a1f'} style={{ width: 48, height: 34, padding: 2 }} /><label className="check small"><input type="checkbox" name="use_accent" defaultChecked={Boolean(b.accent)} />Use it</label></div>
              </div>
              <div className="field"><label>Mail sender</label><input name="mail_from" defaultValue={b.mail_from ?? ''} placeholder={`${s.org.name} <hello@northem.group>`} /><small>Must be on a domain verified in Resend.</small></div>
              <Submit>Save branding</Submit>
            </form>
          ) : <p className="muted small">Admins can change branding.</p>}
        </section>
        <section className="card">
          <h2>Domains</h2>
          <p className="small muted" style={{ marginTop: -6 }}>Which host serves which site. Add the same host in Vercel and DNS.</p>
          <ul className="list">
            {domains.map((d) => (
              <li key={d.host}>
                <code className="grow small">{d.host}</code>
                <span className="badge">{d.app}{d.division_id ? ` · ${divisions.find((x) => x.id === d.division_id)?.name ?? ''}` : ''}</span>
                {s.atLeast('owner') ? <form action={saveDomain}><input type="hidden" name="host" value={d.host} /><button className="btn btn-sm btn-ghost" name="delete" value="1" aria-label="Remove">✕</button></form> : null}
              </li>
            ))}
          </ul>
          {s.atLeast('owner') ? (
            <form action={saveDomain} className="row" style={{ gap: 6, marginTop: 10 }}>
              <input name="host" placeholder="films.example.com" required style={{ flex: 2, minWidth: 140 }} />
              <select name="app" defaultValue="division">{['landing', 'division', 'portal', 'admin', 'project'].map((a) => <option key={a}>{a}</option>)}</select>
              <select name="division_id" defaultValue=""><option value="">No division</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
              <Submit className="btn btn-sm">Add</Submit>
            </form>
          ) : null}
        </section>
      </div>
      <h2 style={{ margin: '28px 0 12px' }}>Divisions</h2>
      <div className="grid-2">
        {divisions.map((d) => (
          <section key={d.id} className="card">
            <form action={saveDivision} className="stack">
              <input type="hidden" name="id" value={d.id} />
              <div className="row" style={{ gap: 8 }}>
                <div className="field" style={{ flex: 1 }}><label>Name</label><input name="name" defaultValue={d.name} disabled={!canDivisions} /></div>
                <div className="field" style={{ width: 80 }}><label>Order</label><input name="sort" type="number" defaultValue={d.sort} disabled={!canDivisions} /></div>
              </div>
              <div className="field"><label>Tagline</label><input name="tagline" defaultValue={d.tagline ?? ''} disabled={!canDivisions} /></div>
              <div className="field"><label>About</label><textarea name="description" rows={4} defaultValue={d.description ?? ''} disabled={!canDivisions} /></div>
              <label className="check"><input type="checkbox" name="is_public" defaultChecked={d.is_public} disabled={!canDivisions} />Shown publicly</label>
              {canDivisions ? <Submit>Save {d.name}</Submit> : null}
            </form>
          </section>
        ))}
      </div>
    </>
  );
}
