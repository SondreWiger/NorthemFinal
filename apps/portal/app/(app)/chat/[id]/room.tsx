'use client';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabaseBrowser } from '@northem/core/supabase/browser';
import type { ChatMessage } from '@northem/core/types';
import { UserAvatarClient } from './avatar';

export interface Author { name: string; avatar: string | null; handle: string | null }
interface Reaction { message_id: string; user_id: string; emoji: string }

const QUICK = ['👍', '❤️', '😂', '🔥', '🎬', '🥶'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' });
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });

/**
 * A realtime chat room. Messages, reactions and edits arrive through Supabase
 * Realtime (RLS applies), and every write uses the browser client as the user.
 */
export function ChatRoom({ channelId, title, topic, me, initial, authors, archived, headerExtra, projectId }: {
  channelId: string; title: string; topic: string | null; me: string; initial: ChatMessage[]; authors: Record<string, Author>;
  archived: boolean; headerExtra?: ReactNode; projectId: string | null;
}) {
  const db = useMemo(() => supabaseBrowser(), []);
  const [msgs, setMsgs] = useState<ChatMessage[]>(initial);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [thread, setThread] = useState<ChatMessage | null>(null);
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initial.length >= 80);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const threadRef = useRef<ChatMessage | null>(null);
  threadRef.current = thread;

  const markRead = useCallback(() => {
    void db.from('chat_members').update({ last_read_at: new Date().toISOString() }).eq('channel_id', channelId).eq('user_id', me);
  }, [db, channelId, me]);

  // Reactions for what's on screen.
  useEffect(() => {
    const ids = msgs.map((m) => m.id);
    if (!ids.length) return;
    void db.from('chat_reactions').select('message_id, user_id, emoji').in('message_id', ids.slice(-200)).then(({ data }) => data && setReactions(data as Reaction[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, channelId]);

  useEffect(() => {
    markRead();
    const sub = db.channel(`room:${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        const m = (payload.new ?? payload.old) as ChatMessage;
        if (payload.eventType === 'DELETE') { setMsgs((xs) => xs.filter((x) => x.id !== (payload.old as ChatMessage).id)); return; }
        const upsert = (xs: ChatMessage[]) => xs.some((x) => x.id === m.id) ? xs.map((x) => (x.id === m.id ? m : x)) : [...xs, m];
        if (m.thread_root_id) {
          if (threadRef.current?.id === m.thread_root_id) setReplies(upsert);
          setMsgs((xs) => xs.map((x) => (x.id === m.thread_root_id && payload.eventType === 'INSERT' ? { ...x, reply_count: x.reply_count + 1 } : x)));
        } else {
          setMsgs(upsert);
          if (payload.eventType === 'INSERT') markRead();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, (payload) => {
        const r = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Reaction;
        if (payload.eventType === 'INSERT') setReactions((xs) => xs.some((x) => x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji) ? xs : [...xs, r]);
        if (payload.eventType === 'DELETE') setReactions((xs) => xs.filter((x) => !(x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji)));
      })
      .subscribe();
    return () => { void db.removeChannel(sub); };
  }, [db, channelId, markRead]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const send = async (body: string, files: File[], threadRoot: string | null) => {
    setError(null);
    const attachments: ChatMessage['attachments'] = [];
    for (const f of files.slice(0, 6)) {
      if (f.size > 25 * 1024 * 1024) { setError(`${f.name} is over 25 MB.`); return false; }
      const path = `${channelId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]+/g, '-').slice(-80)}`;
      const { error: e } = await db.storage.from('chat').upload(path, f, { contentType: f.type || undefined });
      if (e) { setError(`Upload failed: ${e.message}`); return false; }
      attachments.push({ path, name: f.name, mime: f.type, size: f.size });
    }
    const mentions = Object.entries(authors).filter(([, a]) => a.handle && new RegExp(`@${a.handle}\\b`, 'i').test(body)).map(([id]) => id);
    const { data, error: e } = await db.from('chat_messages').insert({ channel_id: channelId, author_id: me, body, attachments, thread_root_id: threadRoot, mentions }).select('*').single();
    if (e) { setError(e.message.includes('row-level') ? "You can't post here." : e.message); return false; }
    const m = data as ChatMessage;
    stick.current = true;
    if (threadRoot) setReplies((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
    else setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
    return true;
  };

  const react = async (m: ChatMessage, emoji: string) => {
    const mine = reactions.some((r) => r.message_id === m.id && r.user_id === me && r.emoji === emoji);
    if (mine) {
      setReactions((xs) => xs.filter((r) => !(r.message_id === m.id && r.user_id === me && r.emoji === emoji)));
      await db.from('chat_reactions').delete().eq('message_id', m.id).eq('user_id', me).eq('emoji', emoji);
    } else {
      setReactions((xs) => [...xs, { message_id: m.id, user_id: me, emoji }]);
      await db.from('chat_reactions').insert({ message_id: m.id, user_id: me, emoji });
    }
  };

  const remove = async (m: ChatMessage) => {
    const { error: e } = await db.from('chat_messages').update({ deleted_at: new Date().toISOString(), body: m.author_id === me ? '' : m.body }).eq('id', m.id);
    if (e) setError("Couldn't delete that message.");
  };

  const saveEdit = async (m: ChatMessage, body: string) => {
    const { error: e } = await db.from('chat_messages').update({ body }).eq('id', m.id);
    if (e) setError("Couldn't edit that message."); else setEditing(null);
  };

  const openThread = async (m: ChatMessage) => {
    setThread(m);
    const { data } = await db.from('chat_messages').select('*').eq('thread_root_id', m.id).order('created_at');
    setReplies((data as ChatMessage[]) ?? []);
  };

  const loadOlder = async () => {
    const oldest = msgs[0];
    if (!oldest) return;
    const { data } = await db.from('chat_messages').select('*').eq('channel_id', channelId).is('thread_root_id', null).lt('created_at', oldest.created_at).order('created_at', { ascending: false }).limit(80);
    const older = ((data as ChatMessage[]) ?? []).reverse();
    stick.current = false;
    setHasMore(older.length >= 80);
    setMsgs((xs) => [...older, ...xs]);
  };

  const renderList = (list: ChatMessage[], inThread: boolean) => list.map((m, i) => {
    const prev = list[i - 1];
    const a = authors[m.author_id ?? ''] ?? { name: 'Someone', avatar: null, handle: null };
    const cont = prev && prev.author_id === m.author_id && !prev.deleted_at && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
    const newDay = !prev || day(prev.created_at) !== day(m.created_at);
    const rs = reactions.filter((r) => r.message_id === m.id);
    const grouped = Object.entries(rs.reduce<Record<string, string[]>>((acc, r) => ({ ...acc, [r.emoji]: [...(acc[r.emoji] ?? []), r.user_id] }), {}));
    return (
      <Fragment key={m.id}>
        {newDay && !inThread ? <div className="chat-day">{day(m.created_at)}</div> : null}
        <div className={`msg ${cont && !newDay ? 'msg-cont' : ''}`}>
          <UserAvatarClient name={a.name} src={a.avatar} size={36} />
          <div style={{ minWidth: 0 }}>
            <div className="msg-meta"><strong>{a.name}</strong><time dateTime={m.created_at}>{time(m.created_at)}</time>{m.edited_at && !m.deleted_at ? <span className="faint small">(edited)</span> : null}</div>
            {m.deleted_at ? <div className="msg-deleted">Message deleted</div> : editing === m.id ? (
              <EditBox initial={m.body} onCancel={() => setEditing(null)} onSave={(b) => saveEdit(m, b)} />
            ) : <div className="msg-body">{highlight(m.body, authors)}</div>}
            {!m.deleted_at && m.attachments?.length ? <div className="row">{m.attachments.map((f) => <Attachment key={f.path} file={f} />)}</div> : null}
            {grouped.length ? (
              <div className="msg-reacts">{grouped.map(([e, us]) => (
                <button key={e} type="button" className={us.includes(me) ? 'mine' : ''} onClick={() => react(m, e)} title={us.map((u) => authors[u]?.name ?? 'Someone').join(', ')}>{e} {us.length}</button>
              ))}</div>
            ) : null}
            {!inThread && m.reply_count > 0 ? <button type="button" className="msg-thread" onClick={() => openThread(m)}>{m.reply_count} {m.reply_count === 1 ? 'reply' : 'replies'} →</button> : null}
          </div>
          {!m.deleted_at && !archived ? (
            <div className="msg-tools">
              {QUICK.slice(0, 4).map((e) => <button key={e} type="button" onClick={() => react(m, e)} aria-label={`React ${e}`}>{e}</button>)}
              {!inThread ? <button type="button" onClick={() => openThread(m)} aria-label="Reply in thread">↳</button> : null}
              {m.author_id === me ? <button type="button" onClick={() => setEditing(m.id)} aria-label="Edit">✎</button> : null}
              {m.author_id === me ? <button type="button" onClick={() => remove(m)} aria-label="Delete">🗑</button> : null}
            </div>
          ) : null}
        </div>
      </Fragment>
    );
  });

  return (
    <section className="chat-room" aria-label={title}>
      <header className="chat-head">
        <a href="/chat" className="btn btn-ghost btn-sm app-mobile-only" aria-label="All conversations">←</a>
        <div style={{ flex: 1, minWidth: 0 }}><strong>{title}</strong>{topic ? <small style={{ display: 'block' }}>{topic}</small> : null}</div>
        {projectId ? <a className="btn btn-sm" href={`/projects/${projectId}`}>Project</a> : null}
        {headerExtra}
      </header>
      <div className="chat-body">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div className="chat-msgs" ref={listRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
            {hasMore ? <button type="button" className="btn btn-sm" style={{ alignSelf: 'center' }} onClick={loadOlder}>Load older</button> : null}
            {msgs.length ? renderList(msgs, false) : <div className="empty" style={{ margin: 'auto' }}><strong>Say something</strong>This is the start of {title}.</div>}
          </div>
          {error ? <div className="notice notice-bad" style={{ margin: '0 18px' }}>{error}</div> : null}
          {archived ? <div className="chat-compose muted">This channel is archived.</div> : <Composer placeholder={`Message ${title}`} onSend={(b, f) => send(b, f, null)} />}
        </div>
        {thread ? (
          <aside className="chat-thread" aria-label="Thread">
            <header className="chat-head"><strong style={{ flex: 1 }}>Thread</strong><button type="button" className="btn btn-ghost btn-sm" onClick={() => setThread(null)} aria-label="Close thread">✕</button></header>
            <div className="chat-msgs">{renderList([thread, ...replies], true)}</div>
            {!archived ? <Composer placeholder="Reply…" onSend={(b, f) => send(b, f, thread.id)} /> : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function highlight(body: string, authors: Record<string, Author>): ReactNode {
  const handles = new Set(Object.values(authors).map((a) => a.handle?.toLowerCase()).filter(Boolean));
  return body.split(/(@[\w.-]+|https?:\/\/\S+)/g).map((part, i) => {
    if (part.startsWith('@') && handles.has(part.slice(1).toLowerCase())) return <span key={i} className="mention">{part}</span>;
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Composer({ placeholder, onSend }: { placeholder: string; onSend: (body: string, files: File[]) => Promise<boolean> }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = async () => {
    const text = body.trim();
    if ((!text && !files.length) || busy) return;
    setBusy(true);
    const ok = await onSend(text, files);
    setBusy(false);
    if (ok) { setBody(''); setFiles([]); if (fileRef.current) fileRef.current.value = ''; }
  };
  return (
    <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label className="btn btn-ghost btn-sm" title="Attach files" style={{ cursor: 'pointer' }}>
        📎<input ref={fileRef} type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {files.length ? <small className="muted">{files.map((f) => f.name).join(', ')}</small> : null}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} rows={1} maxLength={20000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} aria-label={placeholder} />
      </div>
      <button className="btn btn-primary" disabled={busy || (!body.trim() && !files.length)}>{busy ? '…' : 'Send'}</button>
    </form>
  );
}

function EditBox({ initial, onSave, onCancel }: { initial: string; onSave: (b: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <textarea className="input" value={v} onChange={(e) => setV(e.target.value)} autoFocus
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(v.trim()); } }} />
      <div className="row"><button type="button" className="btn btn-sm btn-primary" onClick={() => onSave(v.trim())}>Save</button><button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

function Attachment({ file }: { file: ChatMessage['attachments'][number] }) {
  const db = useMemo(() => supabaseBrowser(), []);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void db.storage.from('chat').createSignedUrl(file.path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [db, file.path]);
  if (file.mime.startsWith('image/') && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={file.name} style={{ maxWidth: 320, maxHeight: 240, borderRadius: 6, marginTop: 4 }} /></a>;
  }
  return <a className="msg-att" href={url ?? '#'} target="_blank" rel="noreferrer">📄 {file.name} <span className="faint">{Math.ceil(file.size / 1024)} KB</span></a>;
}
