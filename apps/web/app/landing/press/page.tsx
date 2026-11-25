import { listPublicPressKits } from '@northem/core/queries';
import { env } from '@northem/core/env';
import { SiteForm } from '@northem/ui/forms';
import { submitForm } from '@/actions';
import { siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('landing', 'Press');

export default async function Press() {
  const kits = await listPublicPressKits();
  return (
    <>
      <header className="page-head nm-wrap">
        <span className="nm-kicker">Press</span>
        <h1>Press room</h1>
        <p>Stills, synopses and statements you can use. Accredited press get embargoed kits in the portal.</p>
      </header>
      <section className="nm-wrap page-body">
        {kits.length ? (
          <ul className="nm-openings">
            {kits.map((k) => (
              <li key={k.id}>
                <div style={{ padding: '18px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className="nm-kicker">Press kit</span>
                  <h2 style={{ fontFamily: 'var(--font-display)', margin: '4px 0' }}>{k.title}</h2>
                  {k.summary ? <p className="nm-sub">{k.summary}</p> : null}
                  <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {k.items.map((it) => {
                      const href = it.url ?? (it.storage_path ? `${env.supabaseUrl}/storage/v1/object/public/press/${it.storage_path}` : null);
                      return href ? <a key={it.id} className="nm-btn" href={href} target="_blank" rel="noreferrer">{it.title} ↓</a> : null;
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="nm-sub">No public kits yet. Ask below and we&apos;ll send what you need.</p>}
        <p className="nm-sub" style={{ marginTop: 24 }}>Press with an account: <a href={`${env.portalUrl}/press`}>open the press room in the portal</a>.</p>
      </section>
      <section className="nm-wrap page-body form-panel">
        <h2>Request material or an interview</h2>
        <SiteForm action={submitForm} form="press" submitLabel="Send request" successTitle="Request sent"
          fields={[{ name: 'name', label: 'Your name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'outlet', label: 'Outlet' }, { name: 'deadline', label: 'Deadline' },
            { name: 'message', label: 'What you need', type: 'textarea', required: true }]} />
      </section>
    </>
  );
}
