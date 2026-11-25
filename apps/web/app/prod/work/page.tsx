import { WorkPage, siteMeta } from '@/routes';

export const revalidate = 60;
export const metadata = siteMeta('prod', 'Work');
export default function Page() { return <WorkPage site="prod" />; }
