import type { RouteAdapter, UmiRoute } from '../types';

export const v5Adapter: RouteAdapter = {
  /**
   * Generates @@/routes.ts
   * Strategy: Default to 'lazy import'. Only '/' and its redirect target use 'require'.
   */
  genRoutesData: (routes: UmiRoute[]) => {
    const rootRedirect = routes.find((r) => r.path === '/' && r.redirect)?.redirect;
    const syncPaths = new Set(['/', rootRedirect].filter(Boolean) as string[]);

    const stringifyRoutes = (list: UmiRoute[]): string => {
      const entries = list.map((route) => {
        const isSync = !!route.path && syncPaths.has(route.path);

        const props = Object.entries(route)
          .map(([key, value]) => {
            if (key === 'routes' && Array.isArray(value)) {
              // Fix ESLint: Explicitly cast to UmiRoute[] to avoid unsafe-argument
              return `routes: ${stringifyRoutes(value as UmiRoute[])}`;
            }

            if (key === 'component' && typeof value === 'string') {
              return isSync
                ? `component: require('${value}').default`
                : `component: lazy(() => import('${value}'))`;
            }

            if (key === 'wrappers' && Array.isArray(value)) {
              const wrappers = value.map((w: string) => 
                isSync ? `require('${w}').default` : `lazy(() => import('${w}'))`
              );
              return `wrappers: [${wrappers.join(', ')}]`;
            }

            return `${key}: ${JSON.stringify(value)}`;
          })
          .join(',\n      ');
        return `{\n      ${props}\n    }`;
      });
      return `[\n    ${entries.join(',\n    ')}\n  ]`;
    };

    return `// @ts-nocheck
import { lazy } from 'react';

export default ${stringifyRoutes(routes)};
`;
  },

  /**
   * Generates @@/renderRoutes.tsx
   * Injects the custom loading component into Suspense fallback.
   */
  genRenderComponent: (loadingPath?: string) => {
    const loadingImport = loadingPath 
      ? `import Loading from '${loadingPath}';` 
      : 'const Loading = () => null;';

    return `// @ts-nocheck
import React, { Suspense } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
${loadingImport}

export const RenderRoutes = ({ routes }: { routes: unknown[] }) => {
  if (!routes || !Array.isArray(routes)) return null;

  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        {routes.map((route: any, i: number) => {
          const key = route.path || \`route-\${i}\`;
          if (route.redirect) {
            return (
              <Redirect
                key={key}
                exact={!!route.exact}
                from={route.path}
                to={route.redirect}
              />
            );
          }

          return (
            <Route
              key={key}
              path={route.path}
              exact={!!route.exact}
              render={(props) => {
                const RawComponent = route.component || ((p: Record<string, unknown>) => <React.Fragment>{p.children}</React.Fragment>);
                const wrappers = route.wrappers || [];
                
                let content = <RenderRoutes routes={route.routes} />;
                content = <RawComponent {...props}>{content}</RawComponent>;

                return wrappers.reduceRight((acc: any, Wrapper: any) => {
                  return <Wrapper {...props}>{acc}</Wrapper>;
                }, content);
              }}
            />
          );
        })}
      </Switch>
    </Suspense>
  );
};
`;
  },

  genRuntimeCode: () => `// @ts-nocheck
import React from 'react';
import { Router } from 'react-router-dom';
import { history } from '../history';
import { runners } from '../runners';
import routesData from '../routes';
import { RenderRoutes } from '../renderRoutes';

export const rootContainer = (container: React.ReactElement | null) => {
  runners.patchRoutes({ routes: routesData });

  const routesTree = (
    <Router history={history}>
      <RenderRoutes routes={routesData} />
    </Router>
  );

  React.useEffect(() => {
    const handler = (location: unknown, action: string) => {
      runners.onRouteChange({ location, action, routes: routesData });
    };
    const unlisten = history.listen(handler);
    handler(history.location, 'POP');
    return unlisten;
  }, []);

  if (container) {
    return React.cloneElement(container, { children: routesTree });
  }

  return routesTree;
};
`,

  genExports: () => "export { useHistory, useLocation, useParams, Link, NavLink } from 'react-router-dom';\n",
};
