import { PersonRoute, personMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = personMetadata;
export default function Page(props: PageProps<'/dev/people/[slug]'>) { return <PersonRoute site="dev" params={props.params} />; }
