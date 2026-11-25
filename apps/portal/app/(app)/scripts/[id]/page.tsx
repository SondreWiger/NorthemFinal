import type { Metadata } from 'next';
import { requireMember } from '@northem/core/session';
import { IntegrationError, sps } from '@northem/core/integrations';
import { Empty, Notice, PageHeader } from '@northem/ui/app';

export const metadata: Metadata = { title: 'Script' };

interface El { element_type?: string; type?: string; content?: string; text?: string }

/** Read-only script view from Screenplay Studio, formatted like a page. */
export default async function Script(props: PageProps<'/scripts/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const s = await requireMember(`/scripts/${id}`);
  let content: React.ReactNode;
  try {
    const data = await sps.readScript(s.userId, id);
    if (data === null) content = <Empty title="Connect Screenplay Studio">Add your token under <a href="/me#connections">My profile</a> to read scripts here.</Empty>;
    else {
      const d = data as { script?: { title?: string }; elements?: El[]; text?: string } | string;
      const els: El[] = typeof d === 'object' && Array.isArray(d.elements) ? d.elements : [];
      const text = typeof d === 'string' ? d : typeof d.text === 'string' ? d.text : null;
      content = (
        <div className="script">
          {els.length ? els.map((e, i) => {
            const t = (e.element_type ?? e.type ?? 'action').toLowerCase();
            const c = e.content ?? e.text ?? '';
            const style: React.CSSProperties = t === 'scene_heading' ? { fontWeight: 700, textTransform: 'uppercase', marginTop: 24 }
              : t === 'character' ? { marginLeft: '38%', textTransform: 'uppercase', marginTop: 12 }
              : t === 'dialogue' ? { marginLeft: '22%', marginRight: '18%' }
              : t === 'parenthetical' ? { marginLeft: '30%' }
              : t === 'transition' ? { textAlign: 'right', textTransform: 'uppercase', marginTop: 12 } : { marginTop: 12 };
            return <div key={i} style={style}>{c}</div>;
          }) : text ?? JSON.stringify(d, null, 2)}
        </div>
      );
    }
  } catch (e) {
    content = <Notice kind="bad">{e instanceof IntegrationError ? e.message : 'Could not load the script.'}</Notice>;
  }
  const back = typeof sp.project === 'string' ? `/projects/${sp.project}?tab=scripts` : '/projects';
  return (
    <>
      <PageHeader crumbs={[{ href: back, label: 'Back to project' }]} title="Script" sub="Read-only. Edit it in Screenplay Studio." />
      {content}
    </>
  );
}
