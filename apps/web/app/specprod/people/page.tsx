import { PeoplePage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('specprod', 'People');
export default function Page() { return <PeoplePage site="specprod" />; }
