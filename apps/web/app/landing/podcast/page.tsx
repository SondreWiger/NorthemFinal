import { PodcastPage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('landing', 'Podcast');
export default function Page() { return <PodcastPage site="landing" />; }
