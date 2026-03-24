import { isAbsolute, join } from 'node:path';
import { cloneDeep } from 'lodash-es';
import type { UmiRoute } from './types';

function winPath(path: string): string {
  return path.replace(/\\/g, '/');
}

function patchRoute(route: UmiRoute, parentPath: string): void {
  if (
    route.path &&
    route.path.charAt(0) !== '/' &&
    !/^https?:\/\//.test(route.path)
  ) {
    route.path = winPath(join(parentPath, route.path));
  }

  if (route.redirect && route.redirect.charAt(0) !== '/') {
    route.redirect = winPath(join(parentPath, route.redirect));
  }

  if (route.routes) {
    patchRoutes(route.routes, route.path || parentPath);
  } else if (!('exact' in route)) {
    route.exact = true;
  }

  if (
    route.component &&
    typeof route.component === 'string' &&
    !route.component.startsWith('@/') &&
    !isAbsolute(route.component)
  ) {
    route.component = `@/pages/${route.component}`;
  }

  if (route.wrappers) {
    route.wrappers = route.wrappers.map((wrapper) => {
      return wrapper.startsWith('@/') || isAbsolute(wrapper)
        ? wrapper
        : `@/pages/${wrapper}`;
    });
  }
}

function patchRoutes(routes: UmiRoute[], parentPath = '/'): void {
  for (const route of routes) {
    patchRoute(route, parentPath);
  }
}

export function getNormalizedRoutes(routes: UmiRoute[]): UmiRoute[] {
  const cloned = cloneDeep(routes);
  patchRoutes(cloned);
  return cloned;
}
