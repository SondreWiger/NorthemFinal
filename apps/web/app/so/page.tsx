import { getDivisions, listOpenings, listProjects } from '@northem/core/queries';
import { Sticker, Waveform } from '@northem/ui/micro';
import { GenArt } from '@northem/ui/poster';
import { BurstButton, NotifStack, OpeningList, ProjectGrid } from '@northem/ui/public';
import { SiteForm } from '@northem/ui/forms';
import { submitForm } from '@/actions';
import { SITE_CONFIG } from '@/sites';

export const revalidate = 60;

const FEED = [
  { seed: 'so-a', mood: 'pop' as const, cap: 'day 12: the road ends here', likes: '48.2k' },
  { seed: 'so-b', mood: 'frost' as const, cap: 'boiling water at −30 🥶', likes: '1.1M' },
  { seed: 'so-c', mood: 'sea' as const, cap: 'POV: you are a fishing boat', likes: '212k' },
];

const NOTIFS = [
  { who: 'sara.films', what: 'started following you', tone: '#ff3d7f' },
  { who: 'tromsø_kommune', what: 'shared your video', tone: '#3c8cff' },
  { who: 'ola', what: 'commented: "how is it this cold 😭"', tone: '#1a1020' },
  { who: 'northern.lights', what: 'and 2 314 others liked your post', tone: '#7a5cff' },
  { who: 'nrk', what: 'wants to collab', tone: '#e0342a' },
];

const HOOKS = [
  ['“Boiling water at −30”', '1.1M views · 71% watched to the end'],
  ['“POV: you are a fishing boat”', '212k views · 9k shares'],
  ['“The last shop in a town of 40”', '480k views · 2 TV pickups'],
];

const NUMBERS = [['71%', 'avg. watch time'], ['30', 'episodes a month'], ['4', 'platforms native'], ['0', 'boring hooks']];
const FORMATS = ['Daily series', 'Challenge formats', 'Behind the scenes', 'Creator collabs', 'Live drops', 'Explainers that slap'];

export default async function SoHome() {
  const [divisions, projects, openings] = await Promise.all([getDivisions(), listProjects('sonorthem', 8), listOpenings('sonorthem')]);
  const c = SITE_CONFIG.so;
  return (
    <>
      <section className="so-hero nm-wrap">
        <div className="so-hero-copy">
          <Sticker tilt={-5} className="so-st1">new ✦ SoNorthem</Sticker>
          <h1>Made for the feed.<br /><mark>Built to last.</mark></h1>
          <p className="so-lede">Social-first series, formats and channels that people actually follow. Northern stories, cut vertical, posted daily, measured honestly.</p>
          <div className="so-cta">
            <a className="nm-btn nm-btn-primary" href="/contact">Let&apos;s grow →</a>
            <a className="nm-btn" href="/work">See the work</a>
          </div>
        </div>
        <div className="so-phones" aria-hidden>
          {FEED.map((f, i) => (
            <div key={f.seed} className="so-phone" style={{ ['--i' as string]: i }}>
              <GenArt seed={f.seed} mood={f.mood} />
              <div className="so-phone-ui">
                <span className="so-cap">{f.cap}</span>
                <span className="so-likes">♥ {f.likes}</span>
                <Waveform seed={f.seed} bars={20} className="so-wave" />
              </div>
            </div>
          ))}
          <Sticker tilt={10} className="so-st2" color="#c6ff3d">went viral (twice)</Sticker>
          <NotifStack items={NOTIFS} className="so-notifs" />
        </div>
      </section>

      <section className="so-ticker" aria-hidden><div>{Array.from({ length: 2 }, (_, k) => <span key={k}>{FORMATS.map((f) => <b key={f}>{f} ✦ </b>)}</span>)}</div></section>

      <section className="nm-wrap so-section">
        <ul className="so-numbers">
          {NUMBERS.map(([n, l], i) => <li key={l} style={{ ['--i' as string]: i }}><strong data-count={n}>{n}</strong><span>{l}</span></li>)}
        </ul>
      </section>

      <section className="nm-wrap so-section">
        <h2 className="so-h2">Hooks that worked <small className="so-hint">hover to flip</small></h2>
        <ul className="so-hooks">
          {HOOKS.map(([h, r], i) => (
            <li key={h} tabIndex={0} style={{ ['--i' as string]: i }}>
              <div className="so-hook-in"><span className="so-hook-front">{h}</span><span className="so-hook-back">{r}</span></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="nm-wrap so-section">
        <h2 className="so-h2">Stuff we made <a href="/work">all of it →</a></h2>
        <ProjectGrid projects={projects} divisions={divisions} site="so" />
      </section>

      <section className="nm-wrap so-section">
        <h2 className="so-h2">Creators wanted</h2>
        <OpeningList openings={openings} />
      </section>

      <section className="nm-wrap so-section so-form">
        <div>
          <h2 className="so-h2">{c.form.title}</h2>
          <p className="so-lede">{c.form.intro}</p>
          <div className="so-form-fun">
            <Sticker tilt={-4} color="#ff3d7f">we reply fast</Sticker>
            <BurstButton label="Hype" start={1204}>♥</BurstButton>
          </div>
        </div>
        <SiteForm action={submitForm} form={c.form.form} division={c.division} fields={c.form.fields} submitLabel={c.form.submit} successTitle={c.form.success} />
      </section>
    </>
  );
}
