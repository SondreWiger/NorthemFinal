import { JoinPage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('dev', 'Join');
export default function Page() { return <JoinPage site="dev" />; }
