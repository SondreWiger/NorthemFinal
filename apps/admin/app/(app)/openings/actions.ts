'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { slugify } from '@northem/core/format';
import { requireCan } from '@/guard';
import { audit, bool, isUuid, opt, q, rls, str } from '@/util';

const KINDS = ['job', 'crew', 'casting', 'collab', 'internship'];

/** "Showreel link | url | required" per line. */
function parseQuestions(raw: string) {
  return raw.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter(([label]) => label)
    .slice(0, 12).map(([label, type, req]) => ({
      id: slugify(label!).slice(0, 30), label: label!.slice(0, 120),
      type: (['text', 'textarea', 'url'].includes(type ?? '') ? type : 'text') as 'text' | 'textarea' | 'url', required: /req|yes|true/i.test(req ?? ''),
    }));
}

export async function saveOpening(fd: FormData) {
  const s = await requireCan('openings.manage', '/openings');
  const id = str(fd, 'id', 40);
  const kind = str(fd, 'kind', 20);
  const row = {
    org_id: s.org.id, kind: KINDS.includes(kind) ? kind : 'job', title: str(fd, 'title', 200), body: opt(fd, 'body', 8000), location: opt(fd, 'location', 120),
    division_id: isUuid(str(fd, 'division_id', 40)) ? str(fd, 'division_id', 40) : null, project_id: isUuid(str(fd, 'project_id', 40)) ? str(fd, 'project_id', 40) : null,
    closes_at: opt(fd, 'closes_at', 10), questions: parseQuestions(str(fd, 'questions', 3000)), is_open: bool(fd, 'is_open'), is_public: bool(fd, 'is_public'),
  };
  if (!row.title) redirect(`/openings?${q('Give it a title.')}`);
  const db = await supabaseServer();
  const { error } = isUuid(id) ? await db.from('openings').update(row).eq('id', id) : await db.from('openings').insert({ ...row, created_by: s.userId });
  if (!error) await audit(s, isUuid(id) ? 'opening.update' : 'opening.create', 'openings', isUuid(id) ? id : null, { title: row.title });
  redirect(`/openings?${q(error ? rls(error.message, 'Not allowed.') : 'Saved.')}`);
}

export async function deleteOpening(fd: FormData) {
  await requireCan('openings.manage', '/openings');
  const db = await supabaseServer();
  await db.from('openings').delete().eq('id', str(fd, 'id', 40));
  redirect(`/openings?${q('Deleted.')}`);
}
