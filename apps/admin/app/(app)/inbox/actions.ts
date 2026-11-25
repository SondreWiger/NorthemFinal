'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { replyMail, sendMail } from '@northem/core/mail';
import type { SubmissionStatus } from '@northem/core/types';
import { requireCan } from '@/guard';
import { audit, q, str } from '@/util';

const STATUSES: SubmissionStatus[] = ['new', 'reviewing', 'shortlisted', 'replied', 'accepted', 'declined', 'spam', 'archived'];

export async function setStatus(fd: FormData) {
  const s = await requireCan('forms.read', '/inbox');
  const id = str(fd, 'id', 40);
  const status = str(fd, 'status', 20) as SubmissionStatus;
  const assign = fd.has('assigned_to') ? (str(fd, 'assigned_to', 40) || null) : undefined;
  const db = await supabaseServer();
  const { data } = await db.from('submissions').update({ ...(STATUSES.includes(status) ? { status } : {}), ...(assign !== undefined ? { assigned_to: assign } : {}) })
    .eq('id', id).select('id');
  if (data?.length) await audit(s, 'submission.update', 'submissions', id, { status, assign });
  revalidatePath('/inbox');
  redirect(`/inbox/${id}?${q(data?.length ? 'Saved.' : 'Only people who handle the inbox can change that.')}`);
}

export async function addNote(fd: FormData) {
  const s = await requireCan('forms.read', '/inbox');
  const id = str(fd, 'id', 40);
  const body = str(fd, 'body', 4000);
  if (body) {
    const db = await supabaseServer();
    await db.from('submission_notes').insert({ submission_id: id, author_id: s.userId, body });
  }
  redirect(`/inbox/${id}`);
}

export async function reply(fd: FormData) {
  const s = await requireCan('forms.manage', '/inbox');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const { data } = await db.from('submissions').select('email, name, subject').eq('id', id).maybeSingle();
  const sub = data as { email: string; name: string | null; subject: string | null } | null;
  if (!sub) redirect(`/inbox?${q('Not found.')}`);
  const subject = str(fd, 'subject', 200) || `Re: ${sub.subject ?? 'your message'}`;
  const body = str(fd, 'body', 8000);
  if (!body) redirect(`/inbox/${id}?${q('Write something first.')}`);
  const mail = replyMail({ brand: s.org.name, subject, body });
  const res = await sendMail({ to: sub.email, ...mail, replyTo: s.email });
  if (!res.ok) redirect(`/inbox/${id}?${q(`Not sent: ${res.error ?? 'mail failed'}.`)}`);
  await db.from('submission_notes').insert({ submission_id: id, author_id: s.userId, body: `↩ Replied by mail: “${subject}”\n\n${body}` });
  await db.from('submissions').update({ status: 'replied' }).eq('id', id);
  await audit(s, 'submission.reply', 'submissions', id);
  redirect(`/inbox/${id}?${q('Reply sent.')}`);
}

export async function remove(fd: FormData) {
  const s = await requireCan('forms.manage', '/inbox');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  await db.from('submissions').delete().eq('id', id);
  await audit(s, 'submission.delete', 'submissions', id);
  redirect(`/inbox?${q('Deleted.')}`);
}
