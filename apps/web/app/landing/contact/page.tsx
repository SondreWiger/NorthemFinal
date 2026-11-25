import { ContactPage, siteMeta } from '@/routes';

export const metadata = siteMeta('landing', 'Contact');
export default function Page() { return <ContactPage site="landing" />; }
