import { OpeningRoute } from '@/routes';

export const revalidate = 60;
export default function Page(props: PageProps<'/dev/join/[id]'>) { return <OpeningRoute site="dev" params={props.params} />; }
