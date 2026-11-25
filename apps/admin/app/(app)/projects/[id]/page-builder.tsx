'use client';
import { useState } from 'react';
import type { PageBlock, ThemeTokens } from '@northem/core/types';

const LABEL: Record<PageBlock['type'], string> = {
  synopsis: 'Synopsis', credits: 'Credits', gallery: 'Photos and BTS', bloopers: 'Bloopers', trivia: 'Trivia and goofs',
  diary: 'Production diary', podcasts: 'Podcast episodes', stats: 'Fun numbers', text: 'Text section', quote: 'Big quote', video: 'Video',
};
const DEFAULTS: PageBlock[] = [{ type: 'synopsis' }, { type: 'stats' }, { type: 'credits' }, { type: 'gallery' }, { type: 'bloopers' }, { type: 'trivia' }, { type: 'diary' }, { type: 'podcasts' }];
const COLORS: [keyof ThemeTokens, string][] = [['bg', 'Background'], ['surface', 'Cards'], ['fg', 'Text'], ['muted', 'Quiet text'], ['accent', 'Accent'], ['accent2', 'Second accent'], ['line', 'Lines']];
export const FONTS: [string, string][] = [
  ['', 'Site default'], ["var(--f-space), 'Space Grotesk', sans-serif", 'Space Grotesk'], ["var(--f-archivo), 'Archivo', sans-serif", 'Archivo (wide, gritty)'],
  ["var(--f-playfair), Georgia, serif", 'Playfair (classic)'], ["var(--f-bricolage), sans-serif", 'Bricolage (bold, playful)'],
  ["var(--f-caveat), cursive", 'Caveat (handwritten)'], ["var(--f-jet), ui-monospace, monospace", 'JetBrains Mono (technical)'], ["var(--f-inter), system-ui, sans-serif", 'Inter (neutral)'],
];
const PRESETS: { name: string; t: ThemeTokens }[] = [
  { name: 'Polar night', t: { bg: '#07111c', surface: '#0e1b2a', fg: '#e8f3ff', muted: '#8aa3bd', accent: '#9fd8ff', accent2: '#7de2c3', line: '#1b2d42', texture: 'frost' } },
  { name: 'Ash & ember', t: { bg: '#120d0b', surface: '#1c1512', fg: '#f6ebe2', muted: '#a8948a', accent: '#ff6a2b', accent2: '#ffd166', line: '#2f2420', texture: 'ash' } },
  { name: 'Darkroom', t: { bg: '#0d0606', surface: '#1a0d0d', fg: '#f4e4dc', muted: '#a78b82', accent: '#ff3b3b', accent2: '#f7c59f', line: '#331a1a', texture: 'grain' } },
  { name: 'Paper cut', t: { bg: '#f4efe6', surface: '#ffffff', fg: '#1d1a16', muted: '#6f675d', accent: '#d6452b', accent2: '#2b59d6', line: '#1d1a16', texture: 'paper' } },
  { name: 'Terminal', t: { bg: '#050a06', surface: '#0b140d', fg: '#d6ffe0', muted: '#6f9b78', accent: '#3dff8b', accent2: '#ffcf3d', line: '#173320', texture: 'scan' } },
  { name: 'Fjord summer', t: { bg: '#eef6f4', surface: '#ffffff', fg: '#0e2a2a', muted: '#4d6e6c', accent: '#0f8b8d', accent2: '#ff8c42', line: '#cfe3e0', texture: 'none' } },
];

export function PageBuilder({ initialTokens, initialBlocks, siteDefaults }: { initialTokens: ThemeTokens; initialBlocks: PageBlock[]; siteDefaults: ThemeTokens }) {
  const [t, setT] = useState<ThemeTokens>(initialTokens);
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks.length ? initialBlocks : DEFAULTS);
  const [adding, setAdding] = useState<PageBlock['type']>('text');
  const eff = { ...siteDefaults, ...t };
  const set = (k: keyof ThemeTokens, v: string | number | undefined) => setT((x) => { const n = { ...x } as Record<string, unknown>; if (v === undefined || v === '') delete n[k]; else n[k] = v; return n as ThemeTokens; });
  const move = (i: number, d: number) => setBlocks((b) => { const n = [...b]; const j = i + d; if (j < 0 || j >= n.length) return b; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const patch = (i: number, p: Record<string, unknown>) => setBlocks((b) => b.map((x, k) => (k === i ? ({ ...x, ...p } as PageBlock) : x)));
  const add = () => {
    const b: PageBlock = adding === 'text' ? { type: 'text', title: 'A note from set', body: '' } : adding === 'quote' ? { type: 'quote', body: '', by: '' } : adding === 'video' ? { type: 'video', url: '' } : { type: adding } as PageBlock;
    setBlocks((x) => [...x, b]);
  };
  return (
    <div className="stack" style={{ gap: 18 }}>
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <div>
        <label className="small muted">Start from a look</label>
        <div className="row" style={{ gap: 6, marginTop: 6 }}>
          {PRESETS.map((p) => (
            <button key={p.name} type="button" className="btn btn-sm" onClick={() => setT((x) => ({ ...x, ...p.t }))}
              style={{ background: p.t.bg, color: p.t.fg, borderColor: p.t.accent }}>
              <span className="swatch" style={{ background: p.t.accent }} />{p.name}
            </button>
          ))}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setT({})}>Reset to site look</button>
        </div>
      </div>

      <div className="form-grid">
        {COLORS.map(([k, label]) => {
          const on = t[k] !== undefined;
          const val = String(eff[k] ?? '#000000');
          return (
            <div key={k} className="field">
              <label className="check small"><input type="checkbox" name={`use_${k}`} checked={on} onChange={(e) => set(k, e.target.checked ? val : undefined)} />{label}</label>
              <div className="row" style={{ gap: 6 }}>
                <input type="color" name={k} value={val.length === 4 ? `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}` : val.slice(0, 7)} onChange={(e) => set(k, e.target.value)} style={{ width: 44, height: 34, padding: 2 }} aria-label={label} />
                <code className="small faint">{on ? val : `site: ${val}`}</code>
              </div>
            </div>
          );
        })}
        <div className="field"><label>Texture</label>
          <select name="texture" value={t.texture ?? ''} onChange={(e) => set('texture', e.target.value)}>
            <option value="">Site default ({siteDefaults.texture})</option>{['none', 'grain', 'frost', 'ash', 'grid', 'paper', 'scan'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="field"><label>Hero</label>
          <select name="hero" value={t.hero ?? ''} onChange={(e) => set('hero', e.target.value)}>
            <option value="">Poster beside title</option><option value="fullbleed">Full-bleed image</option><option value="split">Split screen</option><option value="type">Huge type only</option>
          </select>
        </div>
        <div className="field"><label>Motion</label>
          <select name="motion" value={t.motion ?? ''} onChange={(e) => set('motion', e.target.value)}><option value="">Site default</option><option value="calm">Calm</option><option value="lively">Lively</option><option value="none">None</option></select>
        </div>
        <div className="field"><label>Corners</label>
          <select name="radius" value={t.radius ?? ''} onChange={(e) => set('radius', e.target.value)}><option value="">Site default</option>{['0px', '2px', '6px', '12px', '18px', '28px'].map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="field"><label>Film grain {t.grain !== undefined ? Math.round(t.grain * 100) + '%' : ''}</label>
          <input type="range" name="grain" min={0} max={0.4} step={0.02} value={t.grain ?? siteDefaults.grain ?? 0.08} onChange={(e) => set('grain', Number(e.target.value))} />
        </div>
        <div className="field"><label>Headline font</label>
          <select name="fontDisplay" value={t.fontDisplay ?? ''} onChange={(e) => set('fontDisplay', e.target.value)}>{FONTS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select>
        </div>
        <div className="field"><label>Body font</label>
          <select name="fontBody" value={t.fontBody ?? ''} onChange={(e) => set('fontBody', e.target.value)}>{FONTS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select>
        </div>
      </div>

      <div className="card" style={{ background: eff.bg, color: eff.fg, borderColor: eff.line, borderRadius: eff.radius, fontFamily: t.fontBody || undefined }}>
        <small style={{ color: eff.muted, letterSpacing: '.12em' }}>PREVIEW SWATCH</small>
        <div style={{ fontFamily: t.fontDisplay || undefined, fontSize: 28, fontWeight: 700, textTransform: 'uppercase', margin: '4px 0' }}>The real side of the work</div>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ background: eff.accent, color: eff.bg, padding: '6px 12px', borderRadius: eff.radius }}>Accent</span>
          <span style={{ border: `1px solid ${eff.accent2}`, color: eff.accent2, padding: '6px 12px', borderRadius: eff.radius }}>Second</span>
          <span style={{ background: eff.surface, padding: '6px 12px', borderRadius: eff.radius }}>Card</span>
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 8px' }}>Sections, top to bottom</h3>
        <ol className="stack" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
          {blocks.map((b, i) => (
            <li key={i} className="block-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="row" style={{ gap: 6 }}>
                <strong className="grow small">{i + 1}. {LABEL[b.type]}</strong>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>↑</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === blocks.length - 1}>↓</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setBlocks((x) => x.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
              </div>
              {b.type !== 'synopsis' && b.type !== 'quote' ? (
                <input placeholder={`Heading (default: ${LABEL[b.type]})`} value={'title' in b ? b.title ?? '' : ''} onChange={(e) => patch(i, { title: e.target.value || undefined })} style={{ marginTop: 6 }} />
              ) : null}
              {b.type === 'text' || b.type === 'quote' ? <textarea rows={3} placeholder={b.type === 'quote' ? 'The line everyone still repeats' : 'Write anything. Blank lines make paragraphs.'} value={b.body} onChange={(e) => patch(i, { body: e.target.value })} style={{ marginTop: 6 }} /> : null}
              {b.type === 'quote' ? <input placeholder="Who said it" value={b.by ?? ''} onChange={(e) => patch(i, { by: e.target.value })} style={{ marginTop: 6 }} /> : null}
              {b.type === 'video' ? <input placeholder="YouTube or Vimeo link" value={b.url} onChange={(e) => patch(i, { url: e.target.value })} style={{ marginTop: 6 }} /> : null}
              {b.type === 'gallery' ? (
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  {['still', 'bts', 'concept', 'poster', 'screenshot', 'video'].map((k) => (
                    <label key={k} className="check small"><input type="checkbox" checked={!b.kinds?.length || b.kinds.includes(k)}
                      onChange={(e) => { const all = ['still', 'bts', 'concept', 'poster', 'screenshot', 'video']; const cur = b.kinds?.length ? b.kinds : all; const next = e.target.checked ? [...cur, k] : cur.filter((x) => x !== k); patch(i, { kinds: next.length === all.length ? undefined : next }); }} />{k}</label>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          <select value={adding} onChange={(e) => setAdding(e.target.value as PageBlock['type'])}>{(Object.keys(LABEL) as PageBlock['type'][]).map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}</select>
          <button type="button" className="btn btn-sm" onClick={add}>Add section</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setBlocks(DEFAULTS)}>Default order</button>
        </div>
      </div>
    </div>
  );
}
