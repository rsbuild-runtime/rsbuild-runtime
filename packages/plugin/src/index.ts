import type { RsbuildPlugin } from '@rsbuild/core';
import type { Feature } from '@rsbuild-runtime/core';
import { RuntimeManager } from './RuntimeManager';
import type { PluginOptions } from './types';

export const pluginRuntime = <T extends readonly Feature<string, unknown>[]>(
  options: PluginOptions<T>,
): RsbuildPlugin => ({
  name: 'rsbuild-plugin-runtime',
  setup(api) {
    const manager = new RuntimeManager(api, options.features, options.tempDir);

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      const userConfig = (options.config ?? {}) as Record<string, unknown>;
      const rsbuildConfigFragment = await manager.execute(
        userConfig,
        mergeRsbuildConfig,
      );

      return mergeRsbuildConfig(config, rsbuildConfigFragment, {
        source: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});

export { RuntimeManager };
