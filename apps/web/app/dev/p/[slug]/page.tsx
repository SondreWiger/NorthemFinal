import { ProjectRoute, projectMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = projectMetadata;
export default function Page(props: PageProps<'/dev/p/[slug]'>) { return <ProjectRoute site="dev" params={props.params} />; }
