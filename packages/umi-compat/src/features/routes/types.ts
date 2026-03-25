export interface UmiRoute {
  path?: string;
  component?: string;
  redirect?: string;
  exact?: boolean;
  routes?: UmiRoute[];
  wrappers?: string[];
  title?: string;
  __toMerge?: boolean;
  __isDynamic?: boolean;
  [key: string]: unknown;
}

export interface RouteAdapter {
  /** Generates data with sync/lazy import logic built-in */
  genRoutesData: (routes: UmiRoute[]) => string;
  genRenderComponent: (loadingPath?: string) => string;
  genRuntimeCode: () => string;
  genExports: () => string;
}

export interface RouteChangeArgs {
  location: unknown;
  action: string;
}

export type OnRouteChange = (args: RouteChangeArgs) => void;
