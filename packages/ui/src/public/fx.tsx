'use client';
// Microinteractions shared by the five public sites. Everything here is an
// enhancement: the pages read fine without JS, and all motion stops for
// people who ask their system for reduced motion.
import { useEffect, useRef, useState, type ReactNode } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mount once per page: scroll reveals, progress bar, header state, magnetic buttons, card spotlight, count-ups, tilt. */
export function SiteFx() {
  useEffect(() => {
    const root = document.documentElement;
    const off: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: Window | Document | Element, ev: K | string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opt);
      off.push(() => t.removeEventListener(ev, fn as EventListener));
    };

    // Header + progress bar.
    const head = document.querySelector<HTMLElement>('.site-head');
    const bar = document.createElement('div');
    bar.className = 'fx-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    off.push(() => bar.remove());
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (head) {
        head.dataset.scrolled = y > 12 ? 'true' : 'false';
        head.dataset.hidden = y > 400 && y > lastY + 4 ? 'true' : y < lastY - 4 ? 'false' : head.dataset.hidden ?? 'false';
      }
      lastY = y;
    };
    on(window, 'scroll', onScroll, { passive: true });
    onScroll();

    if (reduced()) return () => off.forEach((f) => f());
    root.classList.add('fx-on');
    off.push(() => root.classList.remove('fx-on'));

    // Scroll reveals: explicit [data-reveal], plus sections and grid items on every page.
    const auto = document.querySelectorAll<HTMLElement>(
      'main > section > *, main .nm-block, .nm-grid > li, .nm-openings > li, [data-reveal], .people-grid > li, .s-envs > li, .d-steps > li, .so-numbers > li, .l-intents > li, .l-doors li, .p-beliefs > div, .s-safety li, .x-reveal',
    );
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    const groups = new Map<Element, number>();
    auto.forEach((el) => {
      if (el.closest('.nm-lightbox')) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) return; // already on screen: never hide it
      const parent = el.parentElement!;
      const n = groups.get(parent) ?? 0;
      groups.set(parent, n + 1);
      el.style.setProperty('--fx-d', `${Math.min(n, 8) * 60}ms`);
      el.classList.add('fx-reveal');
      io.observe(el);
    });
    off.push(() => io.disconnect());

    // Count-ups: [data-count] holds the final text; numbers inside it roll up once.
    const cio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        cio.unobserve(e.target);
        const el = e.target as HTMLElement;
        const final = el.dataset.count || el.textContent || '';
        const m = final.match(/-?[\d\s.,]*\d/);
        if (!m) continue;
        const raw = m[0];
        const target = Number(raw.replace(/[\s,]/g, ''));
        if (!Number.isFinite(target)) continue;
        const decimals = (raw.split('.')[1] ?? '').length;
        const t0 = performance.now();
        const dur = 1100 + Math.min(900, Math.abs(target) * 2);
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / dur);
          const v = target * (1 - Math.pow(1 - k, 3));
          el.textContent = final.replace(raw, v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace(/,/g, raw.includes(' ') ? ' ' : ','));
          if (k < 1) requestAnimationFrame(tick); else el.textContent = final;
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => cio.observe(el));
    off.push(() => cio.disconnect());

    const fine = window.matchMedia('(pointer: fine)').matches;
    if (fine) {
      // Spotlight that follows the pointer across cards.
      const spot = '.nm-pcard, .door, .l-intents a, .s-envs li, .d-steps li, .nm-openings a, .so-numbers li, .nm-credit, .people-grid a, .p-beliefs > div, .fx-spot';
      on(document, 'pointermove', (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest<HTMLElement>(spot);
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        el.classList.add('fx-lit');
      });

      // Magnetic buttons.
      on(document, 'pointermove', (e: PointerEvent) => {
        const b = (e.target as Element | null)?.closest<HTMLElement>('.nm-btn, .fx-magnet');
        document.querySelectorAll<HTMLElement>('.fx-pulled').forEach((x) => { if (x !== b) { x.style.translate = ''; x.classList.remove('fx-pulled'); } });
        if (!b) return;
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.translate = `${(dx * 8).toFixed(1)}px ${(dy * 6).toFixed(1)}px`;
        b.classList.add('fx-pulled');
      });

      // Gentle 3D tilt on posters.
      on(document, 'pointermove', (e: PointerEvent) => {
        const card = (e.target as Element | null)?.closest<HTMLElement>('.nm-pcard, .fx-tilt');
        document.querySelectorAll<HTMLElement>('.fx-tilting').forEach((x) => { if (x !== card) { x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); x.classList.remove('fx-tilting'); } });
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) - 0.5) * 8}deg`);
        card.style.setProperty('--rx', `${(0.5 - ((e.clientY - r.top) / r.height)) * 8}deg`);
        card.classList.add('fx-tilting');
      });
    }

    // Click ripple on buttons and chips.
    on(document, 'pointerdown', (e: PointerEvent) => {
      const b = (e.target as Element | null)?.closest<HTMLElement>('.nm-btn, .nm-chip, .fx-ripple');
      if (!b) return;
      const r = b.getBoundingClientRect();
      const s = document.createElement('span');
      s.className = 'fx-ripple-dot';
      s.style.left = `${e.clientX - r.left}px`;
      s.style.top = `${e.clientY - r.top}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 600);
    });

    return () => off.forEach((f) => f());
  }, []);
  return null;
}

function useTick(ms: number) {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/** Live clock for a time zone, with a dark/light hint for up north. */
export function LocalClock({ tz = 'Europe/Oslo', place = 'Oslo', className }: { tz?: string; place?: string; className?: string }) {
  const t = useTick(1000);
  const d = t ? new Date(t) : null;
  const time = d ? d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';
  const hour = d ? Number(d.toLocaleString('en-GB', { timeZone: tz, hour: '2-digit', hour12: false })) : 12;
  const dark = hour < 8 || hour >= 16;
  return (
    <span className={`fx-clock ${className ?? ''}`} suppressHydrationWarning>
      <i className={dark ? 'fx-moon' : 'fx-sun'} aria-hidden />
      <span>{place}</span><b suppressHydrationWarning>{time}</b><span className="fx-clock-hint">{dark ? 'dark outside' : 'daylight'}</span>
    </span>
  );
}

/** Film timecode that runs at 24 frames a second. */
export function Timecode({ className }: { className?: string }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const t0 = performance.now() - 47_000; // start mid-take, it looks more alive
    let raf = 0;
    const loop = () => { setF(Math.floor((performance.now() - t0) / (1000 / 24))); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  const fr = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60, h = Math.floor(f / 86400);
  return <span className={`fx-tc ${className ?? ''}`} aria-label="Timecode">{`${p(h)}:${p(m)}:${p(s)}:${p(fr)}`}</span>;
}

/** A terminal that types commands and prints their output, then loops. */
export function Terminal({ script, title = 'zsh', className }: { script: { cmd: string; out: string[] }[]; title?: string; className?: string }) {
  const [lines, setLines] = useState<{ kind: 'cmd' | 'out'; text: string }[]>([]);
  const [typing, setTyping] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced()) {
      setLines(script.flatMap((s) => [{ kind: 'cmd' as const, text: s.cmd }, ...s.out.map((o) => ({ kind: 'out' as const, text: o }))]));
      return;
    }
    let alive = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      while (alive) {
        setLines([]);
        for (const step of script) {
          for (let i = 1; i <= step.cmd.length && alive; i++) { setTyping(step.cmd.slice(0, i)); await sleep(28 + Math.random() * 50); }
          await sleep(250);
          setTyping('');
          setLines((l) => [...l, { kind: 'cmd', text: step.cmd }]);
          for (const o of step.out) { if (!alive) return; await sleep(180 + Math.random() * 220); setLines((l) => [...l, { kind: 'out', text: o }]); }
          await sleep(700);
        }
        await sleep(3500);
      }
    })();
    return () => { alive = false; };
  }, [script]);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [lines, typing]);
  return (
    <div className={`fx-term ${className ?? ''}`} aria-label="Terminal">
      <div className="fx-term-bar"><i /><i /><i /><span>{title}</span></div>
      <div className="fx-term-body" ref={box} aria-live="off">
        {lines.map((l, i) => <div key={i} className={`fx-term-${l.kind}`}>{l.kind === 'cmd' ? <><b>$</b> {l.text}</> : l.text}</div>)}
        <div className="fx-term-cmd"><b>$</b> {typing}<span className="fx-caret">▍</span></div>
      </div>
    </div>
  );
}

/** Notifications that pop in one at a time, like a phone that won't stop buzzing. */
export function NotifStack({ items, className }: { items: { who: string; what: string; tone?: string }[]; className?: string }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    if (reduced()) { setN(3); return; }
    const id = setInterval(() => setN((x) => x + 1), 2200);
    return () => clearInterval(id);
  }, []);
  const shown = Array.from({ length: Math.min(3, n) }, (_, k) => ({ key: n - k, ...items[(n - k - 1 + items.length * 100) % items.length]! }));
  return (
    <ul className={`fx-notifs ${className ?? ''}`} aria-hidden>
      {shown.map((x, i) => (
        <li key={x.key} style={{ ['--k' as string]: i, ...(x.tone ? { ['--tone' as string]: x.tone } : {}) }}>
          <span className="fx-notif-dot">{x.who.slice(0, 1).toUpperCase()}</span>
          <span><b>{x.who}</b> {x.what}</span><small>now</small>
        </li>
      ))}
    </ul>
  );
}

/** A like button that bursts. Counts locally, just for fun. */
export function BurstButton({ label = 'Like', start = 0, children }: { label?: string; start?: number; children?: ReactNode }) {
  const [count, setCount] = useState(start);
  const [bursts, setBursts] = useState<number[]>([]);
  return (
    <button type="button" className="fx-burst" aria-label={`${label} (${count})`} onClick={() => {
      setCount((c) => c + 1);
      const id = Date.now();
      setBursts((b) => [...b, id]);
      setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 800);
    }}>
      {children ?? '♥'} <b>{count.toLocaleString('en-US')}</b>
      {bursts.map((id) => <span key={id} className="fx-burst-ring" aria-hidden>{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${i * 45}deg` }} />)}</span>)}
    </button>
  );
}

/** Click to clap the slate again. */
export function ClapSlate({ children, className }: { children: ReactNode; className?: string }) {
  const [k, setK] = useState(0);
  return (
    <button type="button" className={`fx-clap ${className ?? ''}`} onClick={() => setK((x) => x + 1)} aria-label="Clap the slate">
      <span key={k} className="fx-clap-inner">{children}</span>
      {k ? <span key={`t${k}`} className="fx-take" aria-live="polite">TAKE {k + 1}</span> : null}
    </button>
  );
}

/** Specprod: wind chill and what it means for kit. */
export function WindChill() {
  const [t, setT] = useState(-18);
  const [w, setW] = useState(12);
  const kmh = w * 3.6;
  const wc = kmh < 4.8 || t > 10 ? t : 13.12 + 0.6215 * t - 11.37 * Math.pow(kmh, 0.16) + 0.3965 * t * Math.pow(kmh, 0.16);
  const r = Math.round(wc);
  const level = r > -10 ? 0 : r > -28 ? 1 : r > -40 ? 2 : r > -48 ? 3 : 4;
  const LEVELS = [
    ['Comfortable', 'Standard cold kit. Batteries last about half as long.'],
    ['Cold', 'Heated battery belts, lens heaters, gloves under gloves.'],
    ['Severe', 'Exposed skin freezes in 10 to 30 minutes. Shifts of 20 minutes, warm tent on set.'],
    ['Extreme', 'Frostbite in under 10 minutes. Remote heads, buddy checks, medic on call.'],
    ['Abort line', 'Under 2 minutes to frostbite. We shoot from shelter or come back tomorrow.'],
  ] as const;
  return (
    <div className="fx-chill" data-level={level}>
      <div className="fx-chill-ctl">
        <label><span>Air temperature <b>{t} °C</b></span><input type="range" min={-50} max={5} value={t} onChange={(e) => setT(Number(e.target.value))} /></label>
        <label><span>Wind <b>{w} m/s</b></span><input type="range" min={0} max={40} value={w} onChange={(e) => setW(Number(e.target.value))} /></label>
      </div>
      <div className="fx-chill-out" aria-live="polite">
        <span className="nm-kicker">Feels like</span>
        <strong>{r} °C</strong>
        <span className="fx-chill-meter" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i <= level ? 'on' : ''} />)}</span>
        <em>{LEVELS[level][0]}</em>
        <p>{LEVELS[level][1]}</p>
      </div>
    </div>
  );
}

/** Development: tiny "estimate" toy. Pick what you need, see a rough shape. */
export function ScopeToy() {
  const OPTS = [
    { k: 'Marketing site', w: 2 }, { k: 'Logins and accounts', w: 3 }, { k: 'Payments', w: 3 }, { k: 'Admin panel', w: 4 },
    { k: 'iOS / Android app', w: 6 }, { k: 'Realtime chat', w: 4 }, { k: 'Integrations', w: 3 }, { k: 'Offline mode', w: 5 },
  ];
  const [on, setOn] = useState<Set<string>>(new Set(['Marketing site']));
  const weeks = [...on].reduce((s, k) => s + (OPTS.find((o) => o.k === k)?.w ?? 0), 0);
  const size = weeks <= 3 ? 'Small' : weeks <= 9 ? 'Medium' : weeks <= 18 ? 'Large' : 'Platform';
  return (
    <div className="fx-scope">
      <div className="fx-scope-opts" role="group" aria-label="What you need">
        {OPTS.map((o) => (
          <button key={o.k} type="button" className={`nm-chip ${on.has(o.k) ? 'is-on' : ''}`} aria-pressed={on.has(o.k)}
            onClick={() => setOn((s) => { const n = new Set(s); if (n.has(o.k)) n.delete(o.k); else n.add(o.k); return n; })}>{o.k}</button>
        ))}
      </div>
      <div className="fx-scope-out" aria-live="polite">
        <span className="nm-kicker">rough shape</span>
        <strong>{size}</strong>
        <span className="fx-scope-bar"><i style={{ width: `${Math.min(100, (weeks / 24) * 100)}%` }} /></span>
        <small>{weeks ? `About ${weeks}–${Math.ceil(weeks * 1.5)} weeks with a small team. A real estimate comes after one call.` : 'Pick something to see a rough shape.'}</small>
      </div>
    </div>
  );
}
