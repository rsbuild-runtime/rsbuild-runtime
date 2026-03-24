import { Feature } from '@rsbuild-runtime/core';
import type { FeatureParams, RuntimeIntent } from '@rsbuild-runtime/core';
import type { UmiRoute } from './types';
import { getNormalizedRoutes } from './utils';
import { v5Adapter } from './adapters/v5';

export class UmiRoutesFeature extends Feature<'routes', UmiRoute[]> {
  constructor() {
    super('routes');
  }

  public apply({ getV, config }: FeatureParams<UmiRoute[]>): RuntimeIntent {
    const routerVersion = getV('react-router-dom');
    const adapter = routerVersion >= 6 ? v5Adapter : v5Adapter;

    const normalizedRoutes = getNormalizedRoutes(config ?? []);

    const runtimeContent = `// @ts-nocheck
${adapter.genImports()}

${adapter.genRuntimeCode(normalizedRoutes)}
    `.trim();

    return {
      stage: 100,
      implements: {
        rootContainer: {
          file: 'features/routes/runtime.tsx',
          content: runtimeContent,
        },
        staticExports: {
          // Combine runtime API exports from adapter and type exports from feature
          content: `
${adapter.genExports()}
export type { OnRouteChange, RouteChangeArgs } from './features/routes/types';
          `.trim(),
        },
      },
    };
  }
}
