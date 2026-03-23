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
    const adapter = routerVersion >= 6 ? v5Adapter : v5Adapter; // v6 placeholder

    // 1. Normalize routes based on Umi rules
    const normalizedRoutes = getNormalizedRoutes(config ?? []);

    // 2. Generate runtime content via adapter
    const runtimeContent = `
${adapter.genImports()}
${adapter.genRuntimeCode(normalizedRoutes)}
    `.trim();

    return {
      implements: {
        rootContainer: {
          file: 'features/routes/runtime.tsx',
          content: runtimeContent,
        },
        staticExports: {
          content: adapter.genExports(),
        },
      },
    };
  }
}
