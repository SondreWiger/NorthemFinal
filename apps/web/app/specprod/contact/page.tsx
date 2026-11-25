import { ContactPage, siteMeta } from '@/routes';

export const metadata = siteMeta('specprod', 'Contact');
export default function Page() { return <ContactPage site="specprod" />; }
