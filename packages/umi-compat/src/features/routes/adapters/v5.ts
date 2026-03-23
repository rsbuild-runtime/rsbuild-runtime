import type { RouteAdapter, UmiRoute } from '../types';

export const v5Adapter: RouteAdapter = {
  genImports: () =>
    `
import React from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { createBrowserHistory } from 'history';
  `.trim(),

  genRuntimeCode: (routes: UmiRoute[]) => {
    const renderRoute = (route: UmiRoute, index: number): string => {
      const key = route.path || `route-${index}`;

      if (route.redirect) {
        return `<Redirect key="${key}" exact={${!!route.exact}} from="${route.path}" to="${route.redirect}" />`;
      }

      let componentStr = route.component
        ? `require('${route.component}').default`
        : '(props: any) => <React.Fragment>{props.children}</React.Fragment>';

      if (route.wrappers && route.wrappers.length > 0) {
        componentStr = route.wrappers.reduceRight((memo, wrapper) => {
          return `require('${wrapper}').default(${memo})`;
        }, componentStr);
      }

      const pathAttr = route.path ? `path="${route.path}"` : '';

      if (route.routes) {
        return `
<Route key="${key}" ${pathAttr} exact={${!!route.exact}} render={(props: any) => {
  const Component = ${componentStr};
  return (
    <Component {...props}>
      <Switch>
        ${route.routes.map((r, i) => renderRoute(r, i)).join('\n')}
      </Switch>
    </Component>
  );
}} />`;
      }

      return `<Route key="${key}" ${pathAttr} exact={${!!route.exact}} component={${componentStr}} />`;
    };

    return `
const history = createBrowserHistory();
export const rootContainer = (container: any) => {
  return (
    <Router history={history}>
      <Switch>
        ${routes.map((r, i) => renderRoute(r, i)).join('\n')}
      </Switch>
    </Router>
  );
};
    `.trim();
  },

  genExports: () =>
    `
export { useHistory, useLocation, useParams, Link, NavLink } from 'react-router-dom';
  `.trim(),
};
