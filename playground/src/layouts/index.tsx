import type { IRouteComponentProps, Route } from 'umi';
import 'antd/es/message/style';
import 'antd/es/notification/style';

export interface RouteProps<
  Params extends {
    [K in keyof Params]?: string;
  } = {},
  Query extends {
    [K in keyof Query]?: string;
  } = {},
> extends IRouteComponentProps<Params, Query> {
  route: Route;
}

export default function Layout(props: RouteProps) {
  console.log('layout', props);
  return (
    <main>
      <header>header</header>
      {props.children}
    </main>
  );
}
