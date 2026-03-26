import { Adapter } from '@rsbuild-runtime/core';
import type { UmiRoute } from '../types';

export class V5Adapter extends Adapter {
  /**
   * Generates route configuration data with sync/lazy loading logic.
   */
  public genRoutesData(routes: UmiRoute[]): void {
    const rootRedirect = routes.find(
      (r) => r.path === '/' && r.redirect,
    )?.redirect;

    const syncPaths = new Set(['/', rootRedirect].filter(Boolean) as string[]);

    this.gen.addImport("import { lazy } from 'react';");

    const stringifyRoutes = (list: UmiRoute[]): string => {
      const entries = list.map((route) => {
        const isSync = !!route.path && syncPaths.has(route.path);

        const props = Object.entries(route).map(([key, value]) => {
          if (key === 'routes' && Array.isArray(value)) {
            return `routes: ${stringifyRoutes(value as UmiRoute[])}`;
          }

          if (key === 'component' && typeof value === 'string') {
            // Path normalization is handled automatically by this.gen.template
            return isSync
              ? `component: require('${value}').default`
              : `component: lazy(() => import('${value}'))`;
          }

          if (key === 'wrappers' && Array.isArray(value)) {
            const wrappers = value.map((w: string) =>
              isSync ? `require('${w}').default` : `lazy(() => import('${w}'))`,
            );
            return `wrappers: [${wrappers.join(', ')}]`;
          }

          return `${key}: ${JSON.stringify(value)}`;
        });

        return `{\n${props.join(',\n')}\n}`;
      });

      return `[\n${entries.join(',\n')}\n]`;
    };

    // Use template literal for the main export
    void this.gen.template`
      export default ${stringifyRoutes(routes)};
    `;
  }

  /**
   * Generates the RenderRoutes component using declarative templates.
   */
  public genRenderComponent(loadingPath?: string): void {
    this.gen.addImport(
      "import React, { Suspense, createElement } from 'react';",
    );
    this.gen.addImport(
      "import { Switch, Route, Redirect } from 'react-router-dom';",
    );
    this.gen.addImport(
      "import { __RouterContext as RouterContext } from 'react-router';",
    );

    if (loadingPath) {
      this.gen.addImport(`import Loading from '${loadingPath}';`);
    } else {
      void this.gen.template`const Loading = () => null;`;
    }

    void this.gen.template`
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
                        ? wrappers.reduceRight((acc: React.ReactNode, Wrapper: React.ComponentType<any>) => {
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
      };
    `;
  }

  /**
   * Generates the runtime entry point code.
   */
  public genRuntimeCode(): void {
    this.gen.addImport("import React from 'react';");
    this.gen.addImport("import { Router } from 'react-router-dom';");
    this.gen.addImport("import { history } from '../history';");
    this.gen.addImport("import { runners } from '../runners';");
    this.gen.addImport("import routesData from '../routes';");
    this.gen.addImport("import { RenderRoutes } from '../renderRoutes';");

    void this.gen.template`
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
      };
    `;
  }

  /**
   * Generates standard re-exports for the feature.
   */
  public genExports(): void {
    void this.gen.template`
      export { useHistory, useLocation, useParams, Link, NavLink } from 'react-router-dom';
    `;
  }

  /**
   * Implementation of the required abstract method from Base Adapter.
   * In this case, we use specific methods instead of a single execute,
   * but we can wrap them if needed.
   */
  public execute(): void {
    // Not strictly needed if the Feature calls sub-methods directly,
    // but good for architectural completeness.
  }
}
