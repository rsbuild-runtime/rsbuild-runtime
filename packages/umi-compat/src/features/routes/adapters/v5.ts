import type { RouteAdapter, UmiRoute } from '../types';

export const v5Adapter: RouteAdapter = {
  genImports: () =>
    `
import React, { Suspense, lazy } from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { history } from '../../history';
  `.trim(),

  genRuntimeCode: (routes: UmiRoute[]) => {
    // @ts-nocheck must be the very first line of the output file
    const rootRedirect = routes.find(
      (r) => r.path === '/' && r.redirect,
    )?.redirect;
    const syncPaths = new Set(['/', rootRedirect].filter(Boolean) as string[]);
    const getIndent = (depth: number): string => '  '.repeat(depth);

    const renderRoute = (
      route: UmiRoute,
      index: number,
      depth: number,
    ): string => {
      const indent = getIndent(depth);
      const subIndent = getIndent(depth + 1);
      const key = route.path || `route-${index}`;

      if (route.redirect) {
        return `\n${indent}<Redirect key="${key}" exact={${!!route.exact}} from="${route.path}" to="${route.redirect}" />`;
      }

      const isSync = !route.path || syncPaths.has(route.path);
      const getCompCode = (path: string, sync: boolean): string => {
        return sync
          ? `require('${path}').default`
          : `lazy(() => import('${path}'))`;
      };

      const mainCompCode = route.component
        ? getCompCode(route.component, isSync)
        : '(props: any) => <React.Fragment>{props.children}</React.Fragment>';

      let componentLogic: string;
      if (route.wrappers && route.wrappers.length > 0) {
        const wrapperRefs = route.wrappers.map((w) => getCompCode(w, isSync));
        componentLogic = `${subIndent}const RawComponent = ${mainCompCode};
${subIndent}const wrappers: any[] = [${wrapperRefs.join(', ')}];
${subIndent}const FinalComponent = wrappers.reduceRight((acc, Wrapper) => {
${subIndent}  return (p: any) => <Wrapper {...p}>{acc(p)}</Wrapper>;
${subIndent}}, (p: any) => <RawComponent {...p} />);`;
      } else {
        componentLogic = `${subIndent}const FinalComponent = ${mainCompCode};`;
      }

      const hasRoutes = route.routes && route.routes.length > 0;
      const childrenContent = hasRoutes
        ? `\n${subIndent}  <Switch>${route.routes!.map((r, i) => renderRoute(r, i, depth + 4)).join('')}\n${subIndent}  </Switch>`
        : '';

      return `
${indent}<Route
${indent}  key="${key}"
${indent}  ${route.path ? `path="${route.path}"` : ''}
${indent}  exact={${!!route.exact}}
${indent}  render={(props: any) => {
${componentLogic}
${subIndent}return (
${subIndent}  <Suspense fallback={null}>
${subIndent}    <FinalComponent {...props}>${childrenContent}
${subIndent}    </FinalComponent>
${subIndent}  </Suspense>
${subIndent});
${indent}  }}
${indent}/>`;
    };

    return `export const rootContainer = (container: React.ReactElement | null) => {
  const routesTree = (
    <Router history={history}>
      <Switch>
        ${routes.map((r, i) => renderRoute(r, i, 4)).join('')}
      </Switch>
    </Router>
  );

  if (container) {
    return React.cloneElement(container, { children: routesTree });
  }

  return routesTree;
};
    `.trim();
  },

  genExports: () =>
    "export { useHistory, useLocation, useParams, Link, NavLink } from 'react-router-dom';",
};
