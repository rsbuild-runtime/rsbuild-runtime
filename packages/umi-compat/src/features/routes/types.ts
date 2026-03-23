export interface UmiRoute {
  path?: string;
  component?: string;
  redirect?: string;
  exact?: boolean;
  routes?: UmiRoute[];
  wrappers?: string[];
  title?: string;
  [key: string]: unknown;
}

export interface RouteAdapter {
  genImports: () => string;
  genRuntimeCode: (routes: UmiRoute[]) => string;
  genExports: () => string;
}
