import 'server-only';
import { headers } from 'next/headers';
import { supabaseAdmin, hasServiceRole } from './supabase/admin';
import { getOrgId, getDivisions } from './queries';
import { sendMail, receiptMail, submissionAlertMail } from './mail';
import { env, serverEnv } from './env';
import { FORM_LABEL } from './format';
import { SUBMISSION_FORMS, type SubmissionForm } from './types';

export interface FormState { ok: boolean; message: string; errors?: Record<string, string> }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (f: FormData, k: string, max = 5000) => String(f.get(k) ?? '').trim().slice(0, max);

/**
 * Handles every public form. Bots are caught by a honeypot field ("website")
 * and a minimum fill time; people by a per-email rate limit. Stores the
 * submission with the service role, then mails a receipt and an alert.
 */
export async function handleSubmission(formData: FormData): Promise<FormState> {
  const form = str(formData, 'form', 20) as SubmissionForm;
  if (!SUBMISSION_FORMS.includes(form)) return { ok: false, message: 'Unknown form.' };

  // Honeypot + timing: pretend success so bots learn nothing.
  const started = Number(str(formData, 'started', 20));
  if (str(formData, 'website') || (started && Date.now() - started < 2500)) {
    return { ok: true, message: 'Thanks! We will be in touch.' };
  }

  const name = str(formData, 'name', 200);
  const email = str(formData, 'email', 320).toLowerCase();
  const message = str(formData, 'message', 8000);
  const errors: Record<string, string> = {};
  if (!EMAIL.test(email)) errors.email = 'Add an email address we can reply to.';
  if (form !== 'newsletter' && !name) errors.name = 'Tell us your name.';
  if (!['newsletter'].includes(form) && message.length < 10) errors.message = 'A few more words, please.';
  if (Object.keys(errors).length) return { ok: false, message: 'Almost there.', errors };

  if (!hasServiceRole()) {
    return { ok: false, message: 'Forms are not connected yet. Please mail us directly for now.' };
  }

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from('submissions').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since);
  if ((count ?? 0) >= 4) return { ok: false, message: 'You have sent a few already. Give us a moment to catch up.' };

  const orgId = await getOrgId();
  const divisionSlug = str(formData, 'division', 40);
  const division = divisionSlug ? (await getDivisions()).find((d) => d.slug === divisionSlug) : null;
  const openingId = str(formData, 'opening_id', 40);

  // Everything else the form sent goes into payload (answers, budget, links...).
  const known = new Set(['form', 'started', 'website', 'name', 'email', 'message', 'phone', 'subject', 'division', 'opening_id']);
  const payload: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (!known.has(k) && typeof v === 'string' && v.trim() && !k.startsWith('$')) payload[k.slice(0, 60)] = v.trim().slice(0, 4000);
  }

  const host = (await headers()).get('host') ?? null;
  const { data, error } = await db.from('submissions').insert({
    org_id: orgId, division_id: division?.id ?? null, opening_id: /^[0-9a-f-]{36}$/i.test(openingId) ? openingId : null,
    form, name: name || null, email, phone: str(formData, 'phone', 60) || null, subject: str(formData, 'subject', 300) || null,
    message: message || null, payload, source_host: host,
  }).select('id').single();
  if (error || !data) {
    console.error('[forms] insert failed', error);
    return { ok: false, message: 'Something went wrong on our side. Please try again in a minute.' };
  }

  const label = FORM_LABEL[form];
  const brand = division?.name ?? 'Northem';
  const receipt = receiptMail({ brand, name: name || null, formLabel: label });
  const { mailInbox } = serverEnv();
  await Promise.all([
    form !== 'newsletter' ? sendMail({ to: email, ...receipt }) : Promise.resolve(),
    mailInbox ? sendMail({ to: mailInbox, replyTo: email, ...submissionAlertMail({ brand, formLabel: label, name: name || null, email, message, site: host, url: `${env.adminUrl}/inbox/${data.id}` }) }) : Promise.resolve(),
  ]);

  return { ok: true, message: form === 'newsletter' ? "You're on the list." : 'Thanks! A real person will read this and get back to you.' };
}
