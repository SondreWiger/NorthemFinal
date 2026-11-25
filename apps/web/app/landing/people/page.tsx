import { PeoplePage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('landing', 'People');
export default function Page() { return <PeoplePage site="landing" />; }
