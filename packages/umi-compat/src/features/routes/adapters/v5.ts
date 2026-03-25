import type { RouteAdapter, UmiRoute } from '../types';

export const v5Adapter: RouteAdapter = {
  genRoutesData: (routes: UmiRoute[]) => {
    const rootRedirect = routes.find(
      (r) => r.path === '/' && r.redirect,
    )?.redirect;
    const syncPaths = new Set(['/', rootRedirect].filter(Boolean) as string[]);

    const stringifyRoutes = (list: UmiRoute[]): string => {
      const entries = list.map((route) => {
        const isSync = !!route.path && syncPaths.has(route.path);

        const props = Object.entries(route)
          .map(([key, value]) => {
            if (key === 'routes' && Array.isArray(value)) {
              return `routes: ${stringifyRoutes(value as UmiRoute[])}`;
            }
            if (key === 'component' && typeof value === 'string') {
              return isSync
                ? `component: require('${value}').default`
                : `component: lazy(() => import('${value}'))`;
            }
            if (key === 'wrappers' && Array.isArray(value)) {
              const wrappers = value.map((w: string) =>
                isSync
                  ? `require('${w}').default`
                  : `lazy(() => import('${w}'))`,
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

    return `
import { lazy } from 'react';
export default ${stringifyRoutes(routes)};\n`;
  },

  genRenderComponent: (loadingPath?: string) => {
    const loadingImport = loadingPath
      ? `import Loading from '${loadingPath}';`
      : 'const Loading = () => null;';

    return `
import React, { Suspense, createElement } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { __RouterContext as RouterContext } from 'react-router';
${loadingImport}

export const RenderRoutes = ({ routes, rootRoutes }: { routes: unknown[], rootRoutes: unknown[] }) => {
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
                const childRoutes = <RenderRoutes routes={route.routes} rootRoutes={rootRoutes} />;

                const match = (props as Record<string, unknown>).computedMatch ?? props.match;
                const contextValue = { ...props, match };

                const newProps = {
                  ...props,
                  match,
                  route,
                  routes: rootRoutes,
                };

                const RawComponent = route.component;
                const wrappers = route.wrappers || [];

                let content: React.ReactNode;
                if (RawComponent) {
                  content = <RawComponent {...newProps}>{childRoutes}</RawComponent>;
                } else {
                  content = childRoutes;
                }

                const wrappedContent = wrappers.length > 0
                  ? wrappers.reduceRight((acc: React.ReactNode, Wrapper: React.ComponentType<unknown>) => {
                      return createElement(Wrapper, newProps, acc);
                    }, content)
                  : content;

                return (
                  <RouterContext.Provider value={contextValue}>
                    {wrappedContent}
                  </RouterContext.Provider>
                );
              }}
            />
          );
        })}
      </Switch>
    </Suspense>
  );
};\n`;
  },

  genRuntimeCode: () => `
import React from 'react';
import { Router } from 'react-router-dom';
import { history } from '../history';
import { runners } from '../runners';
import routesData from '../routes';
import { RenderRoutes } from '../renderRoutes';

const RouteRuntimeWrapper = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    const handler = (location: unknown, action: string) => {
      runners.onRouteChange({ location, action, routes: routesData });
    };
    const unlisten = history.listen(handler);
    handler(history.location, 'POP');
    return unlisten;
  }, []);

  return <Router history={history}>{children}</Router>;
};

export const rootContainer = (container: React.ReactElement | null) => {
  runners.patchRoutes({ routes: routesData });
  const content = <RenderRoutes routes={routesData} rootRoutes={routesData} />;
  const wrappedContent = <RouteRuntimeWrapper>{content}</RouteRuntimeWrapper>;
  return container ? React.cloneElement(container, { children: wrappedContent }) : wrappedContent;
};\n`,

  genExports: () =>
    "export { useHistory, useLocation, useParams, Link, NavLink } from 'react-router-dom';\n",
};
