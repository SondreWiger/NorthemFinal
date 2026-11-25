import { getDivisions, listOpenings, listPeople, listProjects } from '@northem/core/queries';
import { Daylight, Grain, Slate, Sprockets } from '@northem/ui/micro';
import { Avatar, ClapSlate, OpeningList, ProjectGrid, Timecode } from '@northem/ui/public';
import { SiteForm } from '@northem/ui/forms';
import { submitForm } from '@/actions';
import { SITE_CONFIG } from '@/sites';

export const revalidate = 60;

const DAY = [
  ['04:10', 'Call time', 'Coffee in the van. Nobody talks yet.'],
  ['05:30', 'First light (almost)', 'We roll on the walk in. The best stuff happens before people remember the camera.'],
  ['09:00', 'Interview', 'One light, one chair, no list of questions.'],
  ['12:40', 'Lunch with the subject', 'Camera off. This is where we learn what the film is about.'],
  ['15:10', 'Light is gone', 'Hands, windows, kettles. Close-ups by lamp light.'],
  ['22:00', 'Dailies', 'We watch everything. Keep the mistakes. Plan tomorrow.'],
];

const BELIEFS = [
  ['No narrator', 'If someone has to explain the person, we filmed them wrong.'],
  ['Stay longer', 'The good part starts after everyone thinks we are done.'],
  ['Keep the mistakes', 'A shaky frame of a true moment beats a perfect lie.'],
];

export default async function ProdHome() {
  const [divisions, projects, people, openings] = await Promise.all([getDivisions(), listProjects('productions', 9), listPeople(), listOpenings('productions')]);
  const c = SITE_CONFIG.prod;
  const now = projects.find((p) => ['production', 'pre_production', 'post_production'].includes(p.status));
  return (
    <>
      <section className="p-hero">
        <Sprockets count={60} className="p-sprockets" />
        <Grain opacity={0.16} />
        <div className="p-viewfinder" aria-hidden><i /><i /><i /><i /><span className="p-vf-read">ISO 800 · 1/50 · f/2.8 · 3200K</span><span className="p-vf-bat">▮▮▮▯</span></div>
        <div className="nm-wrap p-hero-inner">
          <p className="nm-kicker p-reel"><span className="p-rec" /> REC <Timecode className="p-tc" /> · Reel 01 · Northem Productions</p>
          <h1>The parts of people <em>nobody films.</em></h1>
          <p className="p-lede">Documentaries, films and commercials about bakers at four in the morning, fishermen selling their boats, and towns with forty people left. Real people, no narrator, mistakes included.</p>
          <div className="p-cta">
            <a className="nm-btn nm-btn-primary" href="/contact">Pitch us a story</a>
            <a className="nm-btn" href="/work">Watch the films</a>
          </div>
          <aside className="p-note" aria-label="A note from set">
            <span>note from set —</span> &ldquo;the light was gone by 15:10. we filmed her hands instead. best shot of the week.&rdquo;
          </aside>
        </div>
        <Sprockets count={60} className="p-sprockets" />
      </section>

      {now ? (
        <a className="p-now nm-wrap" href={`/p/${now.slug}`}>
          <ClapSlate className="p-now-slate"><Slate /></ClapSlate>
          <span className="nm-kicker">Now on the slate</span>
          <strong>{now.title}</strong>
          <span>{now.logline}</span>
        </a>
      ) : null}

      <section className="nm-wrap p-section">
        <h2 className="p-h2">The films</h2>
        <ProjectGrid projects={projects} divisions={divisions} site="prod" />
      </section>

      <section className="nm-wrap p-section">
        <h2 className="p-h2">A day on set</h2>
        <ol className="p-day">
          {DAY.map(([t, h, d]) => <li key={t}><time>{t}</time><strong>{h}</strong><p>{d}</p></li>)}
        </ol>
      </section>

      <section className="nm-wrap p-section p-light">
        <div>
          <h2 className="p-h2">We chase the light</h2>
          <p className="p-lede">In December Oslo gets about six hours of daylight. In June it barely gets dark. Every shoot is planned around this line, and the films look the way they do because of it.</p>
        </div>
        <Daylight className="p-daylight" />
      </section>

      <section className="nm-wrap p-section p-beliefs">
        {BELIEFS.map(([t, d], i) => (
          <div key={t}><span className="p-num">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>

      <section className="nm-wrap p-section">
        <h2 className="p-h2">Faces <a href="/people">everyone →</a></h2>
        <ul className="p-faces">
          {people.slice(0, 8).map((p, i) => (
            <li key={p.id} style={{ ['--r' as string]: `${((i * 53) % 9) - 4}deg` }}>
              <a href={`/people/${p.slug}`}><Avatar name={p.name} src={p.photo_url} size={150} className="p-face" /><strong>{p.name}</strong><small>{p.known_for}</small></a>
            </li>
          ))}
        </ul>
      </section>

      <section className="nm-wrap p-section">
        <h2 className="p-h2">Casting real people</h2>
        <OpeningList openings={openings} />
      </section>

      <section className="nm-wrap p-section p-pitch">
        <div>
          <h2 className="p-h2">{c.form.title}</h2>
          <p className="p-lede">{c.form.intro}</p>
        </div>
        <SiteForm action={submitForm} form={c.form.form} division={c.division} fields={c.form.fields} submitLabel={c.form.submit} successTitle={c.form.success} />
      </section>
    </>
  );
}
