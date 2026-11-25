import { getDivisions, listOpenings, listProjects } from '@northem/core/queries';
import { Crystal, Grain, Hazard, Radar, Telemetry, Topo } from '@northem/ui/micro';
import { LocalClock, OpeningList, ProjectGrid, WindChill } from '@northem/ui/public';
import { SiteForm } from '@northem/ui/forms';
import { submitForm } from '@/actions';
import { SITE_CONFIG } from '@/sites';

export const revalidate = 60;

const ENVIRONMENTS = [
  { code: 'ENV-01', name: 'Arctic', limit: '−40 °C', note: 'Heated battery rigs, frost-proof lenses, ski-mobile camera teams.', icon: 'crystal' },
  { code: 'ENV-02', name: 'Volcanic', limit: '18 m from lava', note: 'Gas monitoring, heat-shielded drones, evacuation plans written first.', icon: 'ash' },
  { code: 'ENV-03', name: 'Storm', limit: '41 m/s gusts', note: 'Weather routing, anchored rigs, crews who read a low like a script.', icon: 'storm' },
  { code: 'ENV-04', name: 'Altitude', limit: '6 000 m', note: 'Rope access camera ops, acclimatised crews, lightweight cinema kits.', icon: 'alt' },
  { code: 'ENV-05', name: 'Ocean', limit: 'Beaufort 9', note: 'Stabilised marine rigs, safety boats, cold-water certified divers.', icon: 'sea' },
  { code: 'ENV-06', name: 'Aerial', limit: 'FPV to heavy-lift', note: 'Certified pilots, BVLOS planning, cine drones built to fly in weather.', icon: 'air' },
];

function EnvIcon({ kind }: { kind: string }) {
  if (kind === 'crystal') return <Crystal size={46} />;
  const paths: Record<string, string> = {
    ash: 'M8 40 L22 14 L30 26 L36 18 L46 40 Z M22 10 q4 -6 0 -8 M30 12 q4 -5 1 -9',
    storm: 'M6 22 q8 -10 18 -4 q6 -10 16 -2 q8 0 8 8 H6 Z M20 30 l-4 10 h6 l-4 10 M32 30 l-4 10 h6 l-4 10',
    alt: 'M4 44 L18 18 L26 30 L34 10 L48 44 Z M34 10 v-8 l8 3 l-8 3',
    sea: 'M2 22 q6 -6 12 0 t12 0 t12 0 t12 0 M2 32 q6 -6 12 0 t12 0 t12 0 t12 0 M2 42 q6 -6 12 0 t12 0 t12 0 t12 0',
    air: 'M10 14 h10 M32 14 h10 M15 14 v6 M37 14 v6 M15 20 h22 v8 h-22 z M26 28 v6 M18 38 l8 -4 l8 4',
  };
  return <svg viewBox="0 0 52 52" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d={paths[kind]} /></svg>;
}

export default async function SpecHome() {
  const [divisions, projects, openings] = await Promise.all([getDivisions(), listProjects('specprod', 6), listOpenings('specprod')]);
  const c = SITE_CONFIG.specprod;
  return (
    <>
      <section className="s-hero">
        <Topo seed="specprod-ridge" lines={18} className="s-topo" />
        <div className="s-snow" aria-hidden />
        <Grain opacity={0.14} />
        <Radar seed="specprod-hero" className="s-radar" />
        <div className="nm-wrap s-hero-inner">
          <Telemetry temp="−31" wind="24" alt="1 833" label="FIELD UNIT 03" />
          <h1>We shoot<br />where it <span>hurts.</span></h1>
          <p className="s-lede">Specialist crews for storms, volcanoes, glaciers and minus thirty. When the shot is worth it and the place is not built for cameras, we plan it, rig it, keep everyone alive and bring the footage home.</p>
          <div className="s-cta">
            <a className="nm-btn nm-btn-primary" href="/contact">Book a shoot</a>
            <a className="nm-btn" href="/work">Field work</a>
          </div>
        </div>
        <div className="s-readout nm-wrap" aria-hidden>
          <span>LAT 78.22 N</span><span>LON 15.65 E</span><LocalClock tz="Arctic/Longyearbyen" place="Longyearbyen" /><span>VIS 400 M</span><span>WINDCHILL −47</span><span className="s-batt">BATT <b>61%</b></span>
        </div>
      </section>
      <Hazard />

      <section className="nm-wrap s-section">
        <h2 className="s-h2"><span>01 /</span> Operating envelope</h2>
        <ul className="s-envs">
          {ENVIRONMENTS.map((e) => (
            <li key={e.code}>
              <div className="s-env-top"><span className="nm-kicker">{e.code}</span><EnvIcon kind={e.icon} /></div>
              <strong>{e.name}</strong>
              <span className="s-limit">{e.limit}</span>
              <p>{e.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="nm-wrap s-section">
        <h2 className="s-h2"><span>02 /</span> Field work <a href="/work">all →</a></h2>
        <ProjectGrid projects={projects} divisions={divisions} site="specprod" variant="frames" />
      </section>

      <section className="nm-wrap s-section">
        <h2 className="s-h2"><span>03 /</span> Field calculator</h2>
        <p className="s-lede s-calc-lede">Drag the sliders. This is the first number we look at when planning a cold shoot, and it decides how long anyone stands outside.</p>
        <WindChill />
      </section>

      <section className="nm-wrap s-section s-safety">
        <h2 className="s-h2"><span>04 /</span> Safety is the first shot</h2>
        <ol>
          <li><strong>Recon</strong><span>We scout or source local knowledge before we quote.</span></li>
          <li><strong>Plan</strong><span>Risk assessment, abort criteria and rescue plan, signed before kit is packed.</span></li>
          <li><strong>Crew</strong><span>Mountain guides, medics and certified pilots on the call sheet, not optional extras.</span></li>
          <li><strong>Call it</strong><span>Anyone can stop the shoot. Nobody argues. We come back tomorrow.</span></li>
        </ol>
      </section>

      <section className="nm-wrap s-section">
        <h2 className="s-h2"><span>05 /</span> Join a field crew</h2>
        <OpeningList openings={openings} />
      </section>

      <section className="nm-wrap s-section s-book">
        <div>
          <h2 className="s-h2"><span>06 /</span> {c.form.title}</h2>
          <p className="s-lede">{c.form.intro}</p>
        </div>
        <SiteForm action={submitForm} form={c.form.form} division={c.division} fields={c.form.fields} submitLabel={c.form.submit} successTitle={c.form.success} />
      </section>
    </>
  );
}
