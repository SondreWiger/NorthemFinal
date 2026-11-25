import { ContactPage, siteMeta } from '@/routes';

export const metadata = siteMeta('prod', 'Contact');
export default function Page() { return <ContactPage site="prod" />; }
