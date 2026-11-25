import { ProjectRoute, projectMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = projectMetadata;
export default function Page(props: PageProps<'/specprod/p/[slug]'>) { return <ProjectRoute site="specprod" params={props.params} />; }
