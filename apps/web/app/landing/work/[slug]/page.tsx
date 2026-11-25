import { ProjectRoute, projectMetadata } from '@/routes';

export const revalidate = 60;
export const generateMetadata = projectMetadata;
export default function Page(props: PageProps<'/landing/work/[slug]'>) { return <ProjectRoute site="landing" params={props.params} />; }
