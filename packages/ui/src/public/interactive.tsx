'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Media, Trivia } from '@northem/core/types';
import { GenArt, moodFor } from '../poster';

const MEDIA_LABEL: Record<string, string> = { still: 'Still', bts: 'Behind the scenes', blooper: 'Blooper', poster: 'Poster', concept: 'Concept', video: 'Video', screenshot: 'Screenshot', audio: 'Audio' };

export function MediaThumb({ m, url, title }: { m: Media; url: string | null; title: string }) {
  const isImg = url && !url.startsWith('demo:') && !/youtu|vimeo/.test(url) && m.kind !== 'video' && m.kind !== 'audio';
  return isImg
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url!} alt={m.caption ?? title} loading="lazy" />
    : <GenArt seed={m.id} mood={moodFor(`${title} ${m.location ?? ''} ${url ?? ''}`, m.kind)} label={m.caption ?? title} />;
}

/** Photo wall with a keyboard-friendly lightbox that tells the story behind each shot. */
export function Gallery({ items, urls, title, variant = 'wall' }: { items: Media[]; urls: Record<string, string | null>; title: string; variant?: 'wall' | 'tape' }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + items.length) % items.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items.length, close]);
  const cur = open === null ? null : items[open];
  return (
    <>
      <div className={`nm-gallery nm-gallery-${variant}`}>
        {items.map((m, i) => (
          <button key={m.id} type="button" className={`nm-shot nm-shot-${m.kind}`} onClick={() => setOpen(i)} style={{ ['--tilt' as string]: `${((i * 37) % 7) - 3}deg` }}>
            <MediaThumb m={m} url={urls[m.id] ?? null} title={title} />
            <span className="nm-shot-cap">{m.kind === 'blooper' ? '😅 ' : ''}{m.caption ?? MEDIA_LABEL[m.kind]}</span>
          </button>
        ))}
      </div>
      {cur ? (
        <div className="nm-lightbox" role="dialog" aria-modal="true" aria-label={cur.caption ?? 'Photo'} onClick={close}>
          <figure onClick={(e) => e.stopPropagation()}>
            <div className="nm-lightbox-media">
              {cur.kind === 'video' && urls[cur.id] && /youtu|vimeo/.test(urls[cur.id]!)
                ? <iframe src={toEmbed(urls[cur.id]!)} title={cur.caption ?? 'Video'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                : <MediaThumb m={cur} url={urls[cur.id] ?? null} title={title} />}
            </div>
            <figcaption>
              <span className="nm-kicker">{MEDIA_LABEL[cur.kind]}{cur.location ? ` · ${cur.location}` : ''}{cur.taken_at ? ` · ${cur.taken_at}` : ''}</span>
              <strong>{cur.caption}</strong>
              {cur.story ? <p>{cur.story}</p> : null}
              <span className="nm-lightbox-nav">
                <button type="button" onClick={() => setOpen((open! - 1 + items.length) % items.length)} aria-label="Previous">←</button>
                <span>{open! + 1} / {items.length}</span>
                <button type="button" onClick={() => setOpen((open! + 1) % items.length)} aria-label="Next">→</button>
                <button type="button" onClick={close} aria-label="Close">✕</button>
              </span>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}

function toEmbed(url: string) {
  const yt = url.match(/(?:v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : url;
}

const TRIVIA_LABEL: Record<string, string> = { trivia: 'Trivia', goof: 'Goof', quote: 'Quote', fun_fact: 'Fun fact', confession: 'Confession' };

/** Trivia as a deck of cards you flip through. */
export function TriviaDeck({ items, people }: { items: Trivia[]; people: Record<string, { name: string; href: string }> }) {
  const [i, setI] = useState(0);
  const [filter, setFilter] = useState<string>('all');
  const list = filter === 'all' ? items : items.filter((t) => t.kind === filter);
  const kinds = Array.from(new Set(items.map((t) => t.kind)));
  const cur = list[Math.min(i, list.length - 1)];
  if (!cur) return null;
  const who = cur.person_id ? people[cur.person_id] : null;
  return (
    <div className="nm-deck">
      <div className="nm-deck-tabs" role="tablist">
        {['all', ...kinds].map((k) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => { setFilter(k); setI(0); }}>
            {k === 'all' ? 'All' : TRIVIA_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="nm-deck-stack">
        {list.slice(i + 1, i + 3).map((t, k) => <div key={t.id} className="nm-card-ghost" style={{ ['--k' as string]: k + 1 }} aria-hidden />)}
        <article key={cur.id} className={`nm-card nm-card-${cur.kind}`}>
          <span className="nm-kicker">{TRIVIA_LABEL[cur.kind]} · {Math.min(i, list.length - 1) + 1}/{list.length}</span>
          <p>{cur.body}</p>
          {who ? <a href={who.href} className="nm-card-who">— {who.name}</a> : null}
        </article>
      </div>
      <div className="nm-deck-nav">
        <button type="button" onClick={() => setI((x) => (x - 1 + list.length) % list.length)} aria-label="Previous card">←</button>
        <button type="button" className="nm-deck-shuffle" onClick={() => setI(Math.floor(Math.random() * list.length))}>Shuffle</button>
        <button type="button" onClick={() => setI((x) => (x + 1) % list.length)} aria-label="Next card">→</button>
      </div>
    </div>
  );
}
