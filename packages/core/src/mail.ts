import 'server-only';
import { serverEnv } from './env';

// Resend over its REST API (no SDK needed). Templates are small, inline-styled
// HTML so they look right in every mail client, with a plain-text twin.

export interface MailResult { ok: boolean; id?: string; error?: string }

export async function sendMail(opts: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string; from?: string }): Promise<MailResult> {
  const { resendKey, mailFrom } = serverEnv();
  if (!resendKey) {
    console.warn('[mail] RESEND_API_KEY missing, not sending:', opts.subject);
    return { ok: false, error: 'mail not configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.from ?? mailFrom, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { ok: true, id: body.id } : { ok: false, error: body.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(brand: string, title: string, paragraphs: string[], cta?: { label: string; url: string }, foot?: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#0b0d10;padding:32px 12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#12161b;border:1px solid #232a33;border-radius:14px">
<tr><td style="padding:28px 32px 8px;color:#8fa1b3;font-size:12px;letter-spacing:.18em;text-transform:uppercase">${esc(brand)}</td></tr>
<tr><td style="padding:0 32px;color:#f1f4f7;font-size:22px;font-weight:600;line-height:1.3">${esc(title)}</td></tr>
${paragraphs.map((p) => `<tr><td style="padding:14px 32px 0;color:#c9d3dc;font-size:15px;line-height:1.6">${esc(p)}</td></tr>`).join('')}
${cta ? `<tr><td style="padding:24px 32px 4px"><a href="${esc(cta.url)}" style="display:inline-block;background:#e8f0f7;color:#0b0d10;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${esc(cta.label)}</a></td></tr>
<tr><td style="padding:10px 32px 0;color:#6b7a89;font-size:12px;word-break:break-all">${esc(cta.url)}</td></tr>` : ''}
<tr><td style="padding:28px 32px;color:#6b7a89;font-size:12px;line-height:1.5">${esc(foot ?? 'Sent by ' + brand + '.')}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, '', ...paragraphs, ...(cta ? ['', `${cta.label}: ${cta.url}`] : []), '', foot ?? `Sent by ${brand}.`].join('\n');
  return { html, text };
}

export function inviteMail(p: { brand: string; inviter: string; project?: string | null; role: string; url: string; message?: string | null; expiresDays: number }) {
  const title = p.project ? `${p.inviter} added you to ${p.project}` : `${p.inviter} invited you to ${p.brand}`;
  const paras = [
    p.project ? `You're on the team for ${p.project} as ${p.role}. Set up your profile to see the project, documents and chat.` : `You've been invited as ${p.role}. Set up your profile to get started.`,
    ...(p.message ? [`"${p.message}"`] : []),
    `The link works once and expires in ${p.expiresDays} days. Use the address this mail was sent to.`,
  ];
  return { subject: title, ...layout(p.brand, title, paras, { label: 'Accept and set up profile', url: p.url }, "If you weren't expecting this, you can ignore it.") };
}

export function addedMail(p: { brand: string; inviter: string; project: string; role: string; url: string }) {
  const title = `You're on ${p.project}`;
  return { subject: title, ...layout(p.brand, title, [`${p.inviter} added you to ${p.project} as ${p.role}.`], { label: 'Open the project', url: p.url }) };
}

export function receiptMail(p: { brand: string; name: string | null; formLabel: string }) {
  const title = `We got your ${p.formLabel.toLowerCase()}`;
  return { subject: title, ...layout(p.brand, title, [`Thanks${p.name ? ', ' + p.name : ''}. A real person reads every message, usually within a couple of working days. If it's urgent, just reply to this mail.`]) };
}

export function submissionAlertMail(p: { brand: string; formLabel: string; name: string | null; email: string; message: string | null; url: string; site: string | null }) {
  const title = `New ${p.formLabel.toLowerCase()} from ${p.name || p.email}`;
  return { subject: title, ...layout(p.brand, title, [`From ${p.name ?? 'someone'} <${p.email}>${p.site ? ' via ' + p.site : ''}.`, (p.message ?? '').slice(0, 1200)], { label: 'Open in the inbox', url: p.url }) };
}

export function replyMail(p: { brand: string; subject: string; body: string }) {
  return { subject: p.subject, ...layout(p.brand, p.subject, p.body.split(/\n{2,}/)) };
}
