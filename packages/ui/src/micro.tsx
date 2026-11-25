// Micrographics: small pure-SVG details that make the sites fun to explore.
// They use currentColor and CSS variables so every theme can recolour them.
import type { CSSProperties, ReactNode } from 'react';

type P = { className?: string; style?: CSSProperties; title?: string };

/** A seeded PRNG so the same seed always draws the same art (server == client). */
export function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Compass rose with a slowly searching needle. */
export function Compass({ className, style, title = 'Compass' }: P) {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} role="img" aria-label={title}>
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeOpacity=".2" strokeDasharray="2 4" />
      {ticks.map((a) => (
        <line key={a} x1="100" y1={a % 45 === 0 ? 4 : a % 15 === 0 ? 9 : 12} x2="100" y2="16"
          stroke="currentColor" strokeOpacity={a % 45 === 0 ? 0.9 : 0.4} transform={`rotate(${a} 100 100)`} />
      ))}
      {['N', 'E', 'S', 'W'].map((d, i) => (
        <text key={d} x="100" y="34" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono, monospace)" fill="currentColor"
          transform={`rotate(${i * 90} 100 100)`}>{d}</text>
      ))}
      <g className="nm-needle">
        <path d="M100 30 L106 100 L100 108 L94 100 Z" fill="var(--accent, #ff5a1f)" />
        <path d="M100 170 L106 100 L100 92 L94 100 Z" fill="currentColor" fillOpacity=".35" />
      </g>
      <circle cx="100" cy="100" r="3" fill="currentColor" />
    </svg>
  );
}

/** Topographic contour lines, generated from a seed. */
export function Topo({ seed = 'north', lines = 14, className, style }: P & { seed?: string; lines?: number }) {
  const r = rng(seed);
  const cx = 300 + r() * 200, cy = 200 + r() * 100;
  const paths = Array.from({ length: lines }, (_, i) => {
    const base = 20 + i * 22;
    const pts = Array.from({ length: 48 }, (_, k) => {
      const a = (k / 48) * Math.PI * 2;
      const wob = 1 + 0.18 * Math.sin(a * 3 + i * 0.7 + r() * 0.4) + 0.08 * Math.cos(a * 5 + i);
      return [cx + Math.cos(a) * base * wob * 1.4, cy + Math.sin(a) * base * wob];
    });
    return 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L') + 'Z';
  });
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className={className} style={style} aria-hidden>
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeOpacity={i % 5 === 0 ? 0.35 : 0.14} strokeWidth={i % 5 === 0 ? 1.2 : 0.8} />)}
    </svg>
  );
}

/** Aurora ribbons for the landing hero. Animated with CSS (.nm-aurora). */
export function Aurora({ className, style }: P) {
  return (
    <svg viewBox="0 0 1200 500" preserveAspectRatio="none" className={`nm-aurora ${className ?? ''}`} style={style} aria-hidden>
      <defs>
        <linearGradient id="nm-au1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--aurora-1, #3cf0b4)" stopOpacity="0" />
          <stop offset=".55" stopColor="var(--aurora-1, #3cf0b4)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--aurora-2, #7a5cff)" stopOpacity="0" />
        </linearGradient>
        <filter id="nm-blur"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <g filter="url(#nm-blur)">
        <path className="nm-au-a" d="M0 260 C 200 120, 380 340, 600 200 S 1000 120, 1200 230 L1200 500 L0 500Z" fill="url(#nm-au1)" />
        <path className="nm-au-b" d="M0 320 C 260 220, 420 380, 700 260 S 1050 220, 1200 300 L1200 500 L0 500Z" fill="url(#nm-au1)" opacity=".7" />
      </g>
    </svg>
  );
}

/** Snow / frost crystal. */
export function Crystal({ className, style, size = 40 }: P & { size?: number }) {
  const arm = (a: number) => (
    <g key={a} transform={`rotate(${a} 50 50)`}>
      <line x1="50" y1="50" x2="50" y2="6" />
      <line x1="50" y1="22" x2="40" y2="14" /><line x1="50" y1="22" x2="60" y2="14" />
      <line x1="50" y1="34" x2="43" y2="28" /><line x1="50" y1="34" x2="57" y2="28" />
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {[0, 60, 120, 180, 240, 300].map(arm)}
    </svg>
  );
}

/** Weather telemetry readout for Specprod: temperature, wind, altitude, a fake-live bar. */
export function Telemetry({ temp = '−31', wind = '24', alt = '1 833', label = 'FIELD', className }: P & { temp?: string; wind?: string; alt?: string; label?: string }) {
  return (
    <div className={`nm-telemetry ${className ?? ''}`} aria-label="Field conditions">
      <span className="nm-tel-dot" /> <b>{label}</b>
      <span>T {temp}°C</span><span>W {wind} m/s</span><span>ALT {alt} m</span>
      <svg viewBox="0 0 60 12" width="60" height="12" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 5} y={12 - ((i * 7) % 11) - 1} width="3" height={((i * 7) % 11) + 1} fill="currentColor" className="nm-tel-bar" style={{ animationDelay: `${i * 90}ms` }} />)}
      </svg>
    </div>
  );
}

/** Film sprocket strip (Productions). */
export function Sprockets({ count = 24, className, style }: P & { count?: number }) {
  return (
    <svg viewBox={`0 0 ${count * 20} 20`} preserveAspectRatio="none" className={className} style={style} aria-hidden>
      <rect width={count * 20} height="20" fill="currentColor" />
      {Array.from({ length: count }, (_, i) => <rect key={i} x={i * 20 + 5} y="5" width="10" height="10" rx="2" fill="var(--bg, #0e0d0c)" />)}
    </svg>
  );
}

/** Blueprint grid with dimension callouts (Development). */
export function Blueprint({ className, style }: P) {
  return (
    <svg viewBox="0 0 400 240" className={className} style={style} aria-hidden fill="none" stroke="currentColor">
      <defs>
        <pattern id="nm-bp" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" strokeOpacity=".15" /></pattern>
      </defs>
      <rect width="400" height="240" fill="url(#nm-bp)" stroke="none" />
      <rect x="60" y="50" width="180" height="120" strokeOpacity=".8" />
      <circle cx="300" cy="110" r="44" strokeOpacity=".8" />
      <line x1="60" y1="190" x2="240" y2="190" strokeOpacity=".5" /><line x1="60" y1="185" x2="60" y2="195" /><line x1="240" y1="185" x2="240" y2="195" />
      <text x="150" y="205" fontSize="10" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="var(--font-mono, monospace)">180.00</text>
      <line x1="300" y1="110" x2="331" y2="79" strokeOpacity=".5" />
      <text x="336" y="76" fontSize="10" fill="currentColor" stroke="none" fontFamily="var(--font-mono, monospace)">R44</text>
      <path className="nm-bp-cursor" d="M120 100 l0 16 l4 -4 l3 7 l3 -1 l-3 -7 l6 0 z" fill="var(--accent, #3ce0ff)" stroke="none" />
    </svg>
  );
}

/** A sticker (SoNorthem). Text on a wobbly badge. */
export function Sticker({ children, tilt = -6, className, style, color }: P & { children: ReactNode; tilt?: number; color?: string }) {
  return (
    <span className={`nm-sticker ${className ?? ''}`} style={{ ...style, transform: `rotate(${tilt}deg)`, ...(color ? { background: color } : {}) }}>
      {children}
    </span>
  );
}

/** Audio waveform bars (podcasts). Deterministic from the seed. */
export function Waveform({ seed = 'pod', bars = 48, className, style }: P & { seed?: string; bars?: number }) {
  const r = rng(seed);
  return (
    <svg viewBox={`0 0 ${bars * 4} 32`} preserveAspectRatio="none" className={className} style={style} aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const h = 4 + Math.round((0.3 + 0.7 * Math.abs(Math.sin(i / 3 + r() * 2))) * 26 * r());
        return <rect key={i} x={i * 4} y={(32 - h) / 2} width="2.4" height={h} rx="1.2" fill="currentColor" />;
      })}
    </svg>
  );
}

/** Registration / crop marks for frames and posters. */
export function CropMarks({ className }: P) {
  return (
    <span className={`nm-crop ${className ?? ''}`} aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}

/** Film-grain overlay (CSS + SVG noise). Put inside a position:relative parent. */
export function Grain({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <svg className="nm-grain" style={{ opacity }} aria-hidden>
      <filter id="nm-noise"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#nm-noise)" />
    </svg>
  );
}

/** Slate (clapperboard) mark, the Northem signature. */
export function Slate({ className, style }: P) {
  return (
    <svg viewBox="0 0 64 48" className={`nm-slate ${className ?? ''}`} style={style} aria-hidden>
      <g className="nm-slate-arm"><path d="M2 10 L60 2 L62 10 L4 18 Z" fill="currentColor" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${10 + i * 13} ${9 - i * 1.8} l7 -1 l-4 8 l-7 1 z`} fill="var(--bg, #0e0d0c)" />)}
      </g>
      <rect x="4" y="20" width="56" height="26" fill="currentColor" />
      <rect x="8" y="26" width="22" height="3" fill="var(--bg, #0e0d0c)" /><rect x="8" y="34" width="34" height="3" fill="var(--bg, #0e0d0c)" />
    </svg>
  );
}

/** Hazard stripe band (Specprod). */
export function Hazard({ className, style }: P) {
  return <div className={`nm-hazard ${className ?? ''}`} style={style} aria-hidden />;
}

/** Northem mark: an N built from a mountain ridge and the pole star. */
export function NorthemMark({ className, style, title = 'Northem' }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} role="img" aria-label={title}>
      <path d="M6 40 L6 12 L24 34 L24 8 L42 30 L42 40" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="miter" strokeLinecap="square" />
      <path d="M38 4 l1.6 4.4 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6z" fill="var(--accent, #ff5a1f)" />
    </svg>
  );
}
