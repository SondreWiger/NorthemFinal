import { ContactPage, siteMeta } from '@/routes';

export const metadata = siteMeta('so', 'Contact');
export default function Page() { return <ContactPage site="so" />; }
