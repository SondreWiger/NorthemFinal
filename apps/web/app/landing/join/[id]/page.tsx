import { OpeningRoute } from '@/routes';

export const revalidate = 60;
export default function Page(props: PageProps<'/landing/join/[id]'>) { return <OpeningRoute site="landing" params={props.params} />; }
