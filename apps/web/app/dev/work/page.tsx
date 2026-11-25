import { WorkPage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('dev', 'Work');
export default function Page() { return <WorkPage site="dev" />; }
