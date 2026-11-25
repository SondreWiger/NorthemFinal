import { JoinPage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('specprod', 'Join');
export default function Page() { return <JoinPage site="specprod" />; }
