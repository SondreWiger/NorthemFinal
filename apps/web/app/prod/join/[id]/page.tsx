import { OpeningRoute } from '@/routes';

export const revalidate = 60;
export default function Page(props: PageProps<'/prod/join/[id]'>) { return <OpeningRoute site="prod" params={props.params} />; }
