import { join } from 'node:path';
import { Feature } from '@rsbuild-runtime/core';
import type { FeatureParams, RuntimeIntent } from '@rsbuild-runtime/core';
import type { UmiRoute } from './types';
import { getNormalizedRoutes } from './utils';
import { v5Adapter } from './adapters/v5';

export class UmiRoutesFeature extends Feature<'routes', UmiRoute[]> {
  constructor() {
    super('routes');
  }

  /**
   * Applies Umi-style routing logic.
   * Orchestrates route normalization, data generation, and component rendering.
   */
  public apply({
    getV,
    config,
    allConfig,
    getRequirements,
  }: FeatureParams<UmiRoute[]>): RuntimeIntent {
    const routerVersion = getV('react-router-dom');
    const adapter = routerVersion >= 6 ? v5Adapter : v5Adapter;

    const dynamicImport = allConfig.dynamicImport as
      | Record<string, unknown>
      | undefined;
    const loadingPath = dynamicImport?.loading as string | undefined;

    const normalizedRoutes = getNormalizedRoutes(config ?? []);

    // Extract version requirements from the local package.json
    const pkgPath = join(import.meta.dirname, '../../../package.json');
    const runtimeDeps = getRequirements(
      ['react-router', 'react-router-dom', 'history'],
      pkgPath,
    );

    return {
      stage: 100,
      runtimeDeps,
      files: [
        {
          path: 'routes.ts',
          content: adapter.genRoutesData(normalizedRoutes),
        },
        {
          path: 'renderRoutes.tsx',
          content: adapter.genRenderComponent(loadingPath),
        },
      ],

      implements: {
        rootContainer: {
          file: 'features/routes.tsx',
          content: adapter.genRuntimeCode(),
        },
        staticExports: {
          content:
            `
${adapter.genExports()}
export type { OnRouteChange, RouteChangeArgs, UmiRoute } from './features/routes/types';
          `.trim() + '\n',
        },
      },
    };
  }
}
