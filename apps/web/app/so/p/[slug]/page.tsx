import { ProjectRoute, projectMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = projectMetadata;
export default function Page(props: PageProps<'/so/p/[slug]'>) { return <ProjectRoute site="so" params={props.params} />; }
