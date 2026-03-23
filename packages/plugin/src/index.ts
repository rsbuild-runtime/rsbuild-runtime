import type { RsbuildPlugin } from '@rsbuild/core';
import type { Feature } from '@rsbuild-runtime/core';
import { RuntimeManager } from './RuntimeManager';
import { RuntimeCoreFeature } from './features/RuntimeCoreFeature';
import type { PluginOptions } from './types';

export const pluginRuntime = <T extends readonly Feature<string, unknown>[]>(
  options: PluginOptions<T>,
): RsbuildPlugin => ({
  name: 'rsbuild-plugin-runtime',
  setup(api) {
    const allFeatures = [
      new RuntimeCoreFeature(),
      ...options.features,
    ] as const;
    const manager = new RuntimeManager(api, allFeatures, {
      tempDir: options.tempDir,
      namespace: options.namespace,
    });

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      const userConfig = (options.config ?? {}) as Record<string, unknown>;
      const rsbuildFragment = await manager.execute(userConfig);

      return mergeRsbuildConfig(config, rsbuildFragment, {
        resolve: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});

export * from './types';
export * from './RuntimeManager';
export * from './features/RuntimeCoreFeature';
