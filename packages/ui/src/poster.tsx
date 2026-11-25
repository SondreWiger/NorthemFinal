// Generative posters and stills: every project and media item gets distinctive
// art even before real images are uploaded. Seeded, so it never changes.
import { rng } from './micro';
import type { MediaKind, ProjectKind } from '@northem/core/types';

type Mood = 'frost' | 'ash' | 'storm' | 'night' | 'sea' | 'grid' | 'pop' | 'warm';

export function moodFor(seed: string, kind?: ProjectKind | MediaKind | string, hint?: string): Mood {
  const s = `${seed} ${hint ?? ''}`.toLowerCase();
  if (/frost|snow|ice|white|svalbard|cold|glacier/.test(s)) return 'frost';
  if (/ash|lava|volcan|fire/.test(s)) return 'ash';
  if (/storm|low|wind|hurricane/.test(s)) return 'storm';
  if (/night|natt|dark|tunnel/.test(s)) return 'night';
  if (/salt|sea|vann|fjord|boat/.test(s)) return 'sea';
  if (['website', 'app', 'tool', 'platform', 'game', 'screenshot'].includes(kind ?? '')) return 'grid';
  if (['social'].includes(kind ?? '')) return 'pop';
  return 'warm';
}

const PALETTES: Record<Mood, [string, string, string, string]> = {
  frost: ['#0c1620', '#9fd8ff', '#e9f6ff', '#3d6a8a'],
  ash: ['#140c0a', '#ff6a2b', '#ffd2a8', '#4a2a20'],
  storm: ['#0f1316', '#b8c4cc', '#ffcf3a', '#3a4650'],
  night: ['#07080c', '#f0b44c', '#f7e6c4', '#1c2233'],
  sea: ['#0a1416', '#5ec4c0', '#e8f2ee', '#1d3b40'],
  grid: ['#0b1220', '#3ce0ff', '#e6f7ff', '#1b2b45'],
  pop: ['#ff3d7f', '#c6ff3d', '#1a1020', '#ffd23d'],
  warm: ['#140f0b', '#d9a54a', '#f4e6cf', '#3b2a1c'],
};

/** Mountain ridge + sky, used for posters and placeholder stills. */
export function GenArt({ seed, mood, className, label }: { seed: string; mood: Mood; className?: string; label?: string }) {
  const r = rng(seed);
  const [bg, a, fg, deep] = PALETTES[mood];
  const ridge = (y0: number, amp: number) => {
    let d = `M0 ${y0}`;
    for (let x = 0; x <= 400; x += 20) d += ` L${x} ${(y0 - r() * amp).toFixed(1)}`;
    return d + ' L400 600 L0 600 Z';
  };
  const stars = Array.from({ length: 30 }, () => [r() * 400, r() * 260, r() * 1.4 + 0.3]);
  const sunY = 120 + r() * 120;
  return (
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={label ?? 'Illustration'}>
      <defs>
        <linearGradient id={`g-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={bg} /><stop offset="1" stopColor={deep} />
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill={`url(#g-${seed})`} />
      {mood === 'grid' && Array.from({ length: 30 }, (_, i) => <line key={i} x1={i * 20} y1="0" x2={i * 20} y2="600" stroke={a} strokeOpacity=".08" />)}
      {mood === 'pop'
        ? <>
            <circle cx={120 + r() * 160} cy={200 + r() * 120} r={110} fill={a} />
            <rect x={40 + r() * 60} y={330} width="260" height="160" fill={fg} transform={`rotate(${(r() - 0.5) * 16} 200 400)`} />
            <circle cx={300} cy={120} r={40} fill={deep} />
          </>
        : <>
            {stars.map(([x, y, s], i) => <circle key={i} cx={x} cy={y} r={s} fill={fg} fillOpacity={0.5} />)}
            <circle cx={80 + r() * 240} cy={sunY} r={mood === 'ash' ? 60 : 34} fill={a} fillOpacity={mood === 'night' ? 0.9 : 0.75} />
            <path d={ridge(330 + r() * 30, 120)} fill={deep} fillOpacity=".85" />
            <path d={ridge(400 + r() * 30, 90)} fill={bg} fillOpacity=".9" />
            <path d={ridge(470, 50)} fill="#000" fillOpacity=".55" />
            {mood === 'frost' && Array.from({ length: 70 }, (_, i) => <circle key={`s${i}`} cx={r() * 400} cy={r() * 600} r={r() * 2 + 0.5} fill="#fff" fillOpacity=".7" />)}
            {mood === 'storm' && Array.from({ length: 40 }, (_, i) => { const x = r() * 440; return <line key={`r${i}`} x1={x} y1={r() * 600} x2={x - 30} y2={r() * 600 + 60} stroke={fg} strokeOpacity=".25" />; })}
            {mood === 'ash' && Array.from({ length: 50 }, (_, i) => <circle key={`e${i}`} cx={r() * 400} cy={300 + r() * 300} r={r() * 2.2} fill={a} fillOpacity={r()} />)}
          </>}
    </svg>
  );
}

/** A poster for a project: real image if set, else generated with the title set in type. */
export function Poster({ title, seed, kind, src, year, className, hint }: {
  title: string; seed: string; kind?: ProjectKind; src?: string | null; year?: number | null; className?: string; hint?: string;
}) {
  const mood = moodFor(`${seed} ${title}`, kind, hint);
  return (
    <div className={`nm-poster nm-poster-${mood} ${className ?? ''}`}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={`${title} poster`} loading="lazy" />
        : <GenArt seed={seed} mood={mood} label={`${title} poster art`} />}
      {!src && (
        <div className="nm-poster-type">
          <span className="nm-poster-title">{title}</span>
          {year ? <span className="nm-poster-year">{year}</span> : null}
        </div>
      )}
    </div>
  );
}
