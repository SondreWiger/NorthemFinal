import { PeoplePage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('dev', 'People');
export default function Page() { return <PeoplePage site="dev" />; }
