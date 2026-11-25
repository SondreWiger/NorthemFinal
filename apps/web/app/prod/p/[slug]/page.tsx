import { ProjectRoute, projectMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = projectMetadata;
export default function Page(props: PageProps<'/prod/p/[slug]'>) { return <ProjectRoute site="prod" params={props.params} />; }
