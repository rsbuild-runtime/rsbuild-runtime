import { join } from 'node:path';
import { Feature } from '@rsbuild-runtime/core';
import type { FeatureParams, RuntimeIntent } from '@rsbuild-runtime/core';
import type { UmiRoute } from './types';
import { getNormalizedRoutes } from './utils';
import { V5Adapter } from './adapters/V5Adapter';

export class RoutesFeature extends Feature<'routes', UmiRoute[]> {
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
    namespace,
    tempDir,
    root,
  }: FeatureParams<UmiRoute[]>): RuntimeIntent {
    // 1. Version detection (V6 adapter to be implemented)
    const routerVersion = getV('react-router-dom');
    const AdapterClass = routerVersion >= 6 ? V5Adapter : V5Adapter;

    // 2. Resolve configuration and normalization
    const dynamicImport = allConfig.dynamicImport as
      | Record<string, unknown>
      | undefined;
    const loadingPath = dynamicImport?.loading as string | undefined;

    const normalizedRoutes = getNormalizedRoutes(config ?? []);

    // 3. Dependency management
    const pkgPath = join(import.meta.dirname, '../../../package.json');
    const runtimeDeps = getRequirements(
      ['react-router', 'react-router-dom', 'history'],
      pkgPath,
    );

    /**
     * Helper to get generated content from a fresh adapter instance.
     * This ensures each file has its own independent CodeGenerator buffer.
     */
    const getFileContent = (executor: (adapter: V5Adapter) => void): string => {
      const adapter = new AdapterClass({ namespace, tempDir, root });
      executor(adapter);
      return adapter.getOutput();
    };

    return {
      stage: 100,
      runtimeDeps,
      files: [
        {
          path: 'routes.ts',
          content: getFileContent((a) => a.genRoutesData(normalizedRoutes)),
        },
        {
          path: 'renderRoutes.tsx',
          content: getFileContent((a) => a.genRenderComponent(loadingPath)),
        },
      ],

      implements: {
        rootContainer: {
          file: 'features/routes.tsx',
          content: getFileContent((a) => a.genRuntimeCode()),
        },
        staticExports: {
          content:
            getFileContent((a) => a.genExports()).trim() +
            '\n' +
            "export type { OnRouteChange, RouteChangeArgs, UmiRoute } from './features/routes/types';\n",
        },
      },
    };
  }
}
