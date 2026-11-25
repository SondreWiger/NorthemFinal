import { ContactPage, siteMeta } from '@/routes';

export const metadata = siteMeta('dev', 'Contact');
export default function Page() { return <ContactPage site="dev" />; }
