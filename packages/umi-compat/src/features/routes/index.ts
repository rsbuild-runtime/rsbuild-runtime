import { Feature } from '@rsbuild-runtime/core';
import type { FeatureParams, RuntimeIntent } from '@rsbuild-runtime/core';
import type { UmiRoute } from './types';
import { getNormalizedRoutes } from './utils';
import { v5Adapter } from './adapters/v5';

export class UmiRoutesFeature extends Feature<'routes', UmiRoute[]> {
  constructor() {
    super('routes');
  }

  public apply({ getV, config, allConfig }: FeatureParams<UmiRoute[]>): RuntimeIntent {
    const routerVersion = getV('react-router-dom');
    const adapter = routerVersion >= 6 ? v5Adapter : v5Adapter;

    const dynamicImport = allConfig.dynamicImport as Record<string, unknown> | undefined;
    const loadingPath = dynamicImport?.loading as string | undefined;

    const normalizedRoutes = getNormalizedRoutes(config ?? []);

    return {
      stage: 100,
      files: [
        {
          path: 'routes.ts',
          content: adapter.genRoutesData(normalizedRoutes, dynamicImport),
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
          content: `
${adapter.genExports()}
export type { OnRouteChange, RouteChangeArgs } from './features/routes/types';
`.trim(),
        },
      },
    };
  }
}