import { PersonRoute, personMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = personMetadata;
export default function Page(props: PageProps<'/so/people/[slug]'>) { return <PersonRoute site="so" params={props.params} />; }
