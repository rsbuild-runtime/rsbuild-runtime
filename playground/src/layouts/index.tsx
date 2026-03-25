import 'antd/es/message/style';
import 'antd/es/notification/style';
import React from 'react';
import { Link, useRouteMatch } from 'react-router-dom';

export interface UmiRoute {
  path?: string;
  component?: string;
  redirect?: string;
  exact?: boolean;
  routes?: UmiRoute[];
  wrappers?: string[];
  title?: string;
}

const getNavLinks = (routes: UmiRoute[]) => {
  const getFlatRoutes = (arr: typeof routes) =>
    arr.reduce((acc, route) => {
      acc.push(route);
      if (route.routes) {
        acc.push(...getFlatRoutes(route.routes));
      }
      return acc;
    }, [] as UmiRoute[]);

  return getFlatRoutes(routes).map((route) =>
    route.exact && route.path ? (
      <Link key={route.path} to={route.path}>
        {route.title}
      </Link>
    ) : null,
  );
};

export default function Layout(props: {
  routes: UmiRoute[];
  children: React.ReactNode;
}) {
  const a = useRouteMatch();

  console.log('layout', { props, a });
  return (
    <main>
      <header>
        <nav style={{ display: 'flex', gap: 16 }}>
          {getNavLinks(props.routes)}
        </nav>
      </header>
      {props.children}
    </main>
  );
}
