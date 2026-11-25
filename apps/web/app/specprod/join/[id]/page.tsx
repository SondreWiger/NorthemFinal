import { OpeningRoute } from '@/routes';

export const revalidate = 60;
export default function Page(props: PageProps<'/specprod/join/[id]'>) { return <OpeningRoute site="specprod" params={props.params} />; }
