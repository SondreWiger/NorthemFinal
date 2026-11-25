import { PersonRoute, personMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = personMetadata;
export default function Page(props: PageProps<'/prod/people/[slug]'>) { return <PersonRoute site="prod" params={props.params} />; }
