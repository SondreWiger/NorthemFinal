import { getDivisions, listPeople, listPodcasts, listProjects } from '@northem/core/queries';
import { siteUrl } from '@northem/core/env';
import { Aurora, Blueprint, Compass, Crystal, Daylight, Grain, Radar, Slate, Sprockets, StarField, Sticker, Telemetry, Topo } from '@northem/ui/micro';
import { Avatar, ClapSlate, LocalClock, PodcastList, ProjectGrid } from '@northem/ui/public';
import { SiteForm } from '@northem/ui/forms';
import { submitForm } from '@/actions';
import { SITE_CONFIG } from '@/sites';

export const revalidate = 60;

const DOORS = [
  { site: 'prod' as const, slug: 'productions', name: 'Productions', line: 'Films, documentaries and ads about the parts of people nobody films.', art: <Sprockets count={16} className="door-art door-sprockets" /> },
  { site: 'dev' as const, slug: 'development', name: 'Development', line: 'Websites, apps and tools. Many of them for people who make films.', art: <Blueprint className="door-art" /> },
  { site: 'specprod' as const, slug: 'specprod', name: 'Specprod', line: 'Storms, volcanoes, glaciers, minus thirty. Shots from places cameras should not go.', art: <div className="door-art door-spec"><Radar seed="door" className="door-radar" /><Crystal size={44} /><Telemetry label="LIVE" /></div> },
  { site: 'so' as const, slug: 'sonorthem', name: 'SoNorthem', line: 'Social-first series and channels that people actually follow.', art: <div className="door-art door-so"><Sticker tilt={-8}>for you ✦</Sticker><Sticker tilt={6} color="#ff3d7f">+12k</Sticker></div> },
];

const INTENTS = [
  { href: siteUrl('prod', '/contact'), k: 'Pitch', t: 'I have a story', d: 'A person, a place, an idea worth filming.' },
  { href: siteUrl('dev', '/contact'), k: 'Build', t: 'I need software', d: 'A site, an app, a tool, a platform.' },
  { href: siteUrl('specprod', '/contact'), k: 'Book', t: 'I need the impossible shot', d: 'Cold, heat, wind, height, water.' },
  { href: siteUrl('so', '/contact'), k: 'Grow', t: 'I want to be seen', d: 'Social series, formats, channels.' },
  { href: '/join', k: 'Join', t: 'I want to work with you', d: 'Crew, cast, developers, creators.' },
  { href: '/press', k: 'Press', t: 'I am writing about you', d: 'Press kits, stills, interviews.' },
];

export default async function Home() {
  const [divisions, projects, people, pods] = await Promise.all([getDivisions(), listProjects(null, 8), listPeople(), listPodcasts(3)]);
  const c = SITE_CONFIG.landing;
  return (
    <>
      <section className="l-hero">
        <StarField seed="northem-sky" className="l-hero-stars" />
        <Topo seed="northem" className="l-hero-topo" />
        <Aurora className="l-hero-aurora" />
        <Grain opacity={0.09} />
        <div className="l-hero-inner nm-wrap">
          <p className="l-coords nm-kicker"><span>59.91° N</span><span>10.75° E</span><LocalClock /></p>
          <h1 className="l-word" aria-label="Northem">
            <ClapSlate className="l-slate"><Slate /></ClapSlate>
            {'NORTH'.split('').map((ch, i) => <span key={i} className="l-letter" style={{ ['--i' as string]: i }}>{ch}</span>)}
            <span className="l-em">{'EM'.split('').map((ch, i) => <span key={i} className="l-letter" style={{ ['--i' as string]: i + 5 }}>{ch}</span>)}</span>
          </h1>
          <p className="l-tag">Perfect imperfections.</p>
          <p className="l-lede">We make films about the people at the edge of the frame, build tools that get out of the way, shoot where cameras freeze, and make social people actually watch.</p>
          <div className="l-cta">
            <a className="nm-btn nm-btn-primary" href="#reach-out">Work with us</a>
            <a className="nm-btn" href="/work">See the work</a>
          </div>
          <Compass className="l-compass" />
        </div>
        <a href="#houses" className="l-scroll" aria-label="Scroll to the four houses"><span /></a>
      </section>

      <section className="l-band" aria-label="Northem in numbers">
        <div className="nm-wrap l-band-inner">
          <ul className="l-numbers">
            <li><strong data-count={String(projects.length)}>{projects.length}</strong><span>projects on this page</span></li>
            <li><strong data-count={String(people.length)}>{people.length}</strong><span>people in the credits</span></li>
            <li><strong data-count="4">4</strong><span>houses, one north</span></li>
            <li><strong data-count="−31 °C">−31 °C</strong><span>coldest shoot so far</span></li>
          </ul>
          <Daylight className="l-daylight" />
        </div>
      </section>

      <section className="l-doors nm-wrap" aria-labelledby="houses">
        <h2 id="houses" className="l-h2"><span className="nm-kicker">01</span> Four houses, one north</h2>
        <p className="l-h2-sub">Each house has its own look, its own crew and its own front door. Same values underneath: show up, stay longer, keep the mistakes.</p>
        <ul>
          {DOORS.map((d, i) => {
            const div = divisions.find((x) => x.slug === d.slug);
            return (
              <li key={d.site}>
                <a href={siteUrl(d.site, '/')} className={`door door-${d.site}`} style={{ ['--i' as string]: i }}>
                  <span className="door-num nm-kicker">0{i + 1} / 04</span>
                  {d.art}
                  <span className="door-name">{div?.name ?? d.name}</span>
                  <span className="door-line">{div?.tagline ?? d.line}</span>
                  <span className="door-go" aria-hidden>Enter →</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="nm-wrap l-section" aria-labelledby="work">
        <h2 id="work" className="l-h2"><span className="nm-kicker">02</span> Recent work <a href="/work" className="l-more">All work →</a></h2>
        <ProjectGrid projects={projects} divisions={divisions} site="landing" />
      </section>

      <section className="l-people" aria-labelledby="people">
        <div className="nm-wrap">
          <h2 id="people" className="l-h2"><span className="nm-kicker">03</span> The people <a href="/people" className="l-more">Everyone →</a></h2>
        </div>
        <div className="l-marquee" aria-label="People who work with us">
          <ul>
            {[...people, ...people].map((p, i) => (
              <li key={`${p.id}-${i}`} aria-hidden={i >= people.length || undefined}>
                <a href={`/people/${p.slug}`} tabIndex={i >= people.length ? -1 : undefined}><Avatar name={p.name} src={p.photo_url} size={72} /><strong>{p.name}</strong><small>{p.known_for}</small></a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {pods.length ? (
        <section className="nm-wrap l-section" aria-labelledby="pod">
          <h2 id="pod" className="l-h2"><span className="nm-kicker">04</span> The podcast <a href="/podcast" className="l-more">Every episode →</a></h2>
          <PodcastList items={pods} showProject />
        </section>
      ) : null}

      <section id="reach-out" className="nm-wrap l-section l-reach" aria-labelledby="reach">
        <h2 id="reach" className="l-h2"><span className="nm-kicker">05</span> Reach out</h2>
        <p className="l-reach-lede">Pick the door that fits. Every message lands with a real person.</p>
        <ul className="l-intents">
          {INTENTS.map((x) => (
            <li key={x.k}><a href={x.href}><span className="nm-kicker">{x.k}</span><strong>{x.t}</strong><small>{x.d}</small><span aria-hidden className="l-intent-arrow">↗</span></a></li>
          ))}
        </ul>
        <div className="l-reach-form">
          <div>
            <h3>{c.form.title}</h3>
            <p className="nm-sub">{c.form.intro}</p>
          </div>
          <SiteForm action={submitForm} form={c.form.form} fields={c.form.fields} submitLabel={c.form.submit} successTitle={c.form.success} />
        </div>
      </section>
    </>
  );
}
