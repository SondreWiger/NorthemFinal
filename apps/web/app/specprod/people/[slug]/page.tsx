import { PersonRoute, personMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = personMetadata;
export default function Page(props: PageProps<'/specprod/people/[slug]'>) { return <PersonRoute site="specprod" params={props.params} />; }
