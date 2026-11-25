import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireMember } from '@northem/core/session';
import { Empty } from '@northem/ui/app';
import { myChannels } from '@/data';
import { ChatSidebar } from './sidebar';

export const metadata: Metadata = { title: 'Chat' };

export default async function ChatHome() {
  const s = await requireMember('/chat');
  const channels = await myChannels(s.org.id);
  if (channels[0]) redirect(`/chat/${channels[0].id}`);
  return (
    <div className="chat show-list">
      <ChatSidebar orgId={s.org.id} userId={s.userId} />
      <div className="chat-room" style={{ display: 'grid', placeItems: 'center' }}><Empty title="No conversations yet"><a href="/chat/new">Start one</a>.</Empty></div>
    </div>
  );
}
