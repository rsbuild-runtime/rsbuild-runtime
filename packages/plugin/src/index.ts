import type { RsbuildPlugin } from '@rsbuild/core';
import { RuntimeManager } from './RuntimeManager';
import type { PluginOptions } from './types';

export const pluginRuntime = (options: PluginOptions = {}): RsbuildPlugin => ({
  name: 'rsbuild-plugin-runtime',
  setup(api) {
    const manager = new RuntimeManager(api, options.features || []);

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      // Note: The actual userConfig should be passed from the caller (e.g., umi-compat package)
      // For the generic engine, we assume the host provides the config via options or other means.
      const rsbuildConfigFragment = await manager.execute({});

      return mergeRsbuildConfig(config, rsbuildConfigFragment, {
        source: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});

export * from './types';
export * from './RuntimeManager';
