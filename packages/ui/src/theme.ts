import type { CSSProperties } from 'react';
import type { ThemeTokens, PageBlock, SiteKey } from '@northem/core/types';

// Theme tokens become CSS custom properties on a wrapper element. Sites have
// presets; a project page layers its theme and overrides on top of its site.

export const SITE_THEMES: Record<SiteKey, ThemeTokens> = {
  landing: { bg: '#0e0d0c', surface: '#171513', fg: '#f3eee8', muted: '#a39b91', accent: '#ff5a1f', accent2: '#7de2c3', line: '#2a2622', texture: 'grain', motion: 'calm', radius: '0px' },
  prod: { bg: '#100d0a', surface: '#1a1511', fg: '#f4e9da', muted: '#b0a08a', accent: '#d9a54a', accent2: '#ff5a1f', line: '#2e261e', texture: 'grain', grain: 0.12, motion: 'calm', radius: '2px' },
  specprod: { bg: '#0f1214', surface: '#171b1e', fg: '#e8eef2', muted: '#8d99a3', accent: '#ff5a1f', accent2: '#cfe6f2', line: '#283037', texture: 'frost', grain: 0.1, motion: 'lively', radius: '0px' },
  dev: { bg: '#0a101c', surface: '#101a2b', fg: '#e6f2ff', muted: '#8aa0bd', accent: '#3ce0ff', accent2: '#ff5a1f', line: '#1d2b45', texture: 'grid', motion: 'lively', radius: '6px' },
  so: { bg: '#fff4e4', surface: '#ffffff', fg: '#1a1020', muted: '#6b5a70', accent: '#ff3d7f', accent2: '#c6ff3d', line: '#1a1020', texture: 'none', motion: 'lively', radius: '18px' },
};

const SAFE = /^[#(),.%\-\w\s'"]+$/;
function safe(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length > 120 || !SAFE.test(v) || /url\s*\(|expression|;|\}/i.test(v)) return undefined;
  return v;
}

/** Merge tokens left to right and turn them into CSS variables. */
export function themeStyle(...layers: (ThemeTokens | null | undefined)[]): CSSProperties {
  const t: ThemeTokens = Object.assign({}, ...layers.filter(Boolean));
  const vars: Record<string, string> = {};
  const map: [keyof ThemeTokens, string][] = [
    ['bg', '--bg'], ['surface', '--surface'], ['fg', '--fg'], ['muted', '--muted'], ['accent', '--accent'],
    ['accent2', '--accent-2'], ['line', '--line'], ['radius', '--radius'], ['fontDisplay', '--font-display'], ['fontBody', '--font-body'],
  ];
  for (const [k, css] of map) {
    const v = safe(t[k]);
    if (v) vars[css] = v;
  }
  if (typeof t.grain === 'number') vars['--grain'] = String(Math.max(0, Math.min(1, t.grain)));
  return vars as CSSProperties;
}

export function themeData(t: ThemeTokens | null | undefined) {
  return { 'data-texture': t?.texture ?? 'none', 'data-hero': t?.hero ?? 'poster', 'data-motion': t?.motion ?? 'calm' };
}

/** Default section order for a project page when none was built by hand. */
export const DEFAULT_BLOCKS: PageBlock[] = [
  { type: 'synopsis' }, { type: 'stats' }, { type: 'credits' }, { type: 'gallery' }, { type: 'bloopers' },
  { type: 'trivia' }, { type: 'diary' }, { type: 'podcasts' },
];

export const BLOCK_LABEL: Record<PageBlock['type'], string> = {
  synopsis: 'Synopsis', credits: 'Credits', gallery: 'Photos and BTS', bloopers: 'Bloopers', trivia: 'Trivia and goofs',
  diary: 'Production diary', podcasts: 'Podcast episodes', stats: 'Fun numbers', text: 'Text section', quote: 'Big quote', video: 'Video',
};

/**
 * Scope hand-written CSS to the project wrapper and strip anything that can
 * load remote content or escape the scope.
 */
export function scopeCss(css: string | null | undefined, scope: string): string {
  if (!css) return '';
  const cleaned = css.replace(/<\/?style[^>]*>/gi, '').replace(/@import[^;]*;?/gi, '').replace(/url\s*\([^)]*\)/gi, 'none')
    .replace(/expression\s*\(/gi, '').replace(/javascript:/gi, '').slice(0, 20000);
  return cleaned.replace(/(^|\})\s*([^{}@]+)\s*\{/g, (_m, close: string, sel: string) =>
    `${close} ${sel.split(',').map((s) => `${scope} ${s.trim().replace(/^:root|^body|^html/, '')}`).join(', ')} {`);
}
