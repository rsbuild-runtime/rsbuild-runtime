import type { Adapter } from '@rsbuild-runtime/core';

/**
 * UmiRoute
 * Core route definition following Umi v3/v4 specifications.
 */
export interface UmiRoute {
  path?: string;
  component?: string;
  redirect?: string;
  exact?: boolean;
  routes?: UmiRoute[];
  wrappers?: string[];
  title?: string;
  /** Internal flag for route merging during normalization */
  __toMerge?: boolean;
  /** Internal flag for dynamic route identification */
  __isDynamic?: boolean;
  [key: string]: unknown;
}

/**
 * RouteAdapter
 * Interface for version-specific route generation logic (v5/v6).
 * Extends the base Adapter to utilize CodeGenerator and lifecycle methods.
 */
export interface RouteAdapter extends Adapter {
  /** Processes route data and adds code to the internal generator */
  genRoutesData(routes: UmiRoute[]): void;
  /** Processes the rendering component and adds code to the internal generator */
  genRenderComponent(loadingPath?: string): void;
  /** Generates the runtime integration glue code */
  genRuntimeCode(): void;
  /** Generates standard re-exports for the routing package */
  genExports(): void;
}

/**
 * RouteChangeArgs
 * Payload delivered to the onRouteChange runner.
 */
export interface RouteChangeArgs {
  location: unknown;
  action: string;
  /** Current active routes tree */
  routes?: UmiRoute[];
}

/**
 * OnRouteChange
 * Type definition for the onRouteChange event handler.
 */
export type OnRouteChange = (args: RouteChangeArgs) => void;
