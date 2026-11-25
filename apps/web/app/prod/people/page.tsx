import { PeoplePage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('prod', 'People');
export default function Page() { return <PeoplePage site="prod" />; }
