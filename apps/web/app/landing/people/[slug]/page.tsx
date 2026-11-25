import { PersonRoute, personMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = personMetadata;
export default function Page(props: PageProps<'/landing/people/[slug]'>) { return <PersonRoute site="landing" params={props.params} />; }
