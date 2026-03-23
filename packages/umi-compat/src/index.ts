import type { RsbuildPlugin } from '@rsbuild/core';
import { RuntimeCoreFeature, RuntimeManager } from 'rsbuild-plugin-runtime';
import { loadUmiConfig } from './UmiConfigLoader';
import { UmiAliasFeature } from './features/alias';
import { UmiRoutesFeature } from './features/routes';

/**
 * Umi v3 compatibility plugin for Rsbuild.
 */
export const pluginUmi = (
  umiOptions?: Record<string, unknown>,
): RsbuildPlugin => ({
  name: 'rsbuild-plugin-umi',
  setup(api) {
    const root = api.context.rootPath;

    // Register Umi specific features
    const features = [
      new RuntimeCoreFeature(),
      new UmiAliasFeature(),
      new UmiRoutesFeature(),
    ] as const;

    api.logger.greet('Umi compatibility plugin loaded!2');

    // Use the RuntimeManager from the mechanism package directly
    const manager = new RuntimeManager(api, features, {
      namespace: 'umi',
    });

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      // 1. Load configuration from .umirc.ts or config/config.ts
      const umiConfig = umiOptions || (await loadUmiConfig(root));

      // 2. Execute orchestration and collect build contributions
      const rsbuildFragment = await manager.execute(umiConfig);

      // 3. Merge and apply runtime-specific configuration
      return mergeRsbuildConfig(config, rsbuildFragment, {
        resolve: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});
