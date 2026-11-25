import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import type { Theme } from '@northem/core/types';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireCan } from '@/guard';
import { deleteTheme, saveTheme } from './actions';

export const metadata: Metadata = { title: 'Themes' };

export default async function Themes(props: PageProps<'/themes'>) {
  const sp = await props.searchParams;
  const s = await requireCan('sites.edit', '/themes');
  const db = await supabaseServer();
  const [{ data }, { data: used }] = await Promise.all([
    db.from('themes').select('*').eq('org_id', s.org.id).order('name'),
    db.from('projects').select('theme_id, title').eq('org_id', s.org.id).not('theme_id', 'is', null),
  ]);
  const themes = (data as Theme[]) ?? [];
  const usage = new Map<string, string[]>();
  for (const u of (used as { theme_id: string; title: string }[]) ?? []) usage.set(u.theme_id, [...(usage.get(u.theme_id) ?? []), u.title]);
  const editing = themes.find((t) => t.id === sp.edit);
  return (
    <>
      <PageHeader title="Themes" sub="Reusable looks for project pages. Build one by hand in a project's Public page tab and save it as a theme, or edit tokens and CSS here." />
      {typeof sp.msg === 'string' ? <Notice kind={/saved|deleted/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2">
        <section className="card">
          {themes.length ? (
            <div className="stack">
              {themes.map((t) => (
                <a key={t.id} href={`/themes?edit=${t.id}`} className="block-row" style={{ textDecoration: 'none', background: t.tokens.bg, color: t.tokens.fg, borderColor: t.tokens.accent ?? undefined }}>
                  <span className="row" style={{ gap: 4 }}>{(['accent', 'accent2', 'surface', 'muted'] as const).map((k) => t.tokens[k] ? <span key={k} className="swatch" style={{ background: t.tokens[k] }} /> : null)}</span>
                  <strong className="grow">{t.name}</strong>
                  <small style={{ opacity: 0.7 }}>{usage.get(t.id)?.join(', ') ?? 'unused'}</small>
                </a>
              ))}
            </div>
          ) : <Empty title="No themes yet">Save one from a project&apos;s page builder.</Empty>}
        </section>
        <section className="card">
          <div className="card-head"><h2>{editing ? `Edit “${editing.name}”` : 'New theme'}</h2>{editing ? <a className="small" href="/themes">New instead</a> : null}</div>
          <form action={saveTheme} className="stack" key={editing?.id ?? 'new'}>
            <input type="hidden" name="id" value={editing?.id ?? ''} />
            <div className="field"><label>Name</label><input name="name" defaultValue={editing?.name} required /></div>
            <div className="field"><label>Tokens (JSON)</label><textarea name="tokens" rows={10} spellCheck={false} style={{ fontFamily: 'var(--font-mono)' }}
              defaultValue={JSON.stringify(editing?.tokens ?? { bg: '#0b0f14', fg: '#eef3f8', accent: '#9fd8ff', texture: 'frost', hero: 'fullbleed' }, null, 2)} />
              <small>Keys: bg, surface, fg, muted, accent, accent2, line, radius, fontDisplay, fontBody, grain, texture, hero, motion.</small></div>
            <div className="field"><label>Custom CSS</label><textarea name="custom_css" rows={8} spellCheck={false} style={{ fontFamily: 'var(--font-mono)' }} defaultValue={editing?.custom_css ?? ''} /></div>
            <Submit>Save theme</Submit>
          </form>
          {editing ? <form action={deleteTheme} style={{ marginTop: 10 }}><input type="hidden" name="id" value={editing.id} /><ConfirmSubmit>Delete theme</ConfirmSubmit></form> : null}
        </section>
      </div>
    </>
  );
}
