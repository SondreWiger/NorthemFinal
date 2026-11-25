import { getDivisions, listOpenings, listProjects } from '@northem/core/queries';
import { Blueprint } from '@northem/ui/micro';
import { OpeningList, ProjectGrid, ScopeToy, Terminal } from '@northem/ui/public';
import { rng } from '@northem/ui/micro';
import { SiteForm } from '@northem/ui/forms';
import { submitForm } from '@/actions';
import { SITE_CONFIG } from '@/sites';

export const revalidate = 60;

const STEPS = [
  ['01', 'Listen', 'A call, not a form. What hurts, who uses it, what "done" means.'],
  ['02', 'Sketch', 'A clickable prototype in days, so we argue about the real thing.'],
  ['03', 'Build', 'Small releases every week. You see progress, not status reports.'],
  ['04', 'Stay', 'We keep it running, fast and secure after launch.'],
];

const SCRIPT = [
  { cmd: 'northem new client-portal --template next', out: ['✓ scaffolded 42 files', '✓ auth, roles and audit log wired', '→ preview: https://client-portal.vercel.app'] },
  { cmd: 'npm test', out: ['PASS  rls.test.ts (38 checks)', 'PASS  ui.test.tsx (112 checks)', 'Tests: 150 passed, 0 failed'] },
  { cmd: 'git push && northem ship', out: ['● building… 41s', '✓ deployed to production', '✓ lighthouse 99 / 100 / 100 / 100'] },
];

const STACK = ['TypeScript', 'Next.js', 'React', 'Swift', 'Postgres', 'Supabase', 'Electron', 'Metal', 'OpenCASCADE', 'Vercel'];

const r = rng('uptime');
const UPTIME = Array.from({ length: 90 }, () => r() > 0.03);

export default async function DevHome() {
  const [divisions, projects, openings] = await Promise.all([getDivisions(), listProjects('development', 9), listOpenings('development')]);
  const c = SITE_CONFIG.dev;
  return (
    <>
      <section className="d-hero">
        <div className="d-grid" aria-hidden />
        <div className="nm-wrap d-hero-inner">
          <div>
            <p className="d-term" aria-label="Terminal">
              <span className="d-prompt">~/northem $</span> <span className="d-typed">build --for people-who-make-things</span><span className="d-caret" aria-hidden>▍</span>
            </p>
            <h1>Tools that get<br /><span>out of the way.</span></h1>
            <p className="d-lede">Websites, apps, internal tools and platforms. We built Screenplay Studio, Graphite and Micron for ourselves first, so we know what it feels like on the other side of the screen.</p>
            <div className="d-cta">
              <a className="nm-btn nm-btn-primary" href="/contact">Start a project</a>
              <a className="nm-btn" href="/work">See products</a>
            </div>
          </div>
          <div className="d-hero-side">
            <Blueprint className="d-blueprint" />
            <div className="d-status" aria-label="Status of the things we run">
              <span className="d-status-head"><i /> all systems normal <small>90 days</small></span>
              <span className="d-uptime" aria-hidden>{UPTIME.map((u, i) => <b key={i} className={u ? '' : 'd-blip'} />)}</span>
            </div>
          </div>
        </div>
        <ul className="d-stack nm-wrap" aria-label="What we build with">
          {STACK.map((s, i) => <li key={s} style={{ ['--i' as string]: i }}>{s}</li>)}
        </ul>
      </section>

      <section className="nm-wrap d-section">
        <h2 className="d-h2"><span>// </span>products & work <a href="/work">ls -a →</a></h2>
        <ProjectGrid projects={projects} divisions={divisions} site="dev" variant="frames" />
      </section>

      <section className="nm-wrap d-section d-shell">
        <div>
          <h2 className="d-h2"><span>// </span>ship it, then ship it again</h2>
          <p className="d-lede">Every project gets previews on every change, tests that run on every push and a deploy you can undo in one click. You see the real thing from week one.</p>
        </div>
        <Terminal script={SCRIPT} title="~/northem — zsh" />
      </section>

      <section className="nm-wrap d-section">
        <h2 className="d-h2"><span>// </span>size up your idea</h2>
        <ScopeToy />
      </section>

      <section className="nm-wrap d-section">
        <h2 className="d-h2"><span>// </span>how we work</h2>
        <ol className="d-steps">
          {STEPS.map(([n, t, d]) => <li key={n}><code>{n}</code><strong>{t}</strong><p>{d}</p></li>)}
        </ol>
      </section>

      <section className="nm-wrap d-section">
        <h2 className="d-h2"><span>// </span>open roles</h2>
        <OpeningList openings={openings} />
      </section>

      <section className="nm-wrap d-section d-brief">
        <div>
          <h2 className="d-h2"><span>// </span>{c.form.title.toLowerCase()}</h2>
          <p className="d-lede">{c.form.intro}</p>
          <pre className="d-code" aria-hidden>{`const project = {
  problem: "you tell us",
  plan: "we sketch it",
  estimate: "honest",
};`}</pre>
        </div>
        <SiteForm action={submitForm} form={c.form.form} division={c.division} fields={c.form.fields} submitLabel={c.form.submit} successTitle={c.form.success} />
      </section>
    </>
  );
}
