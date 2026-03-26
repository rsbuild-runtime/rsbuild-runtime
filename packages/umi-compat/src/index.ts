import type { RsbuildPlugin, RsbuildConfig } from '@rsbuild/core';
import { RuntimeCoreFeature, RuntimeManager } from 'rsbuild-plugin-runtime';
import { loadUmiConfig } from './UmiConfigLoader';
import { AliasFeature } from './features/alias';
import { RoutesFeature } from './features/routes';
import { EntryFeature as EntryFeature } from './features/entry';
import { UmiHistoryFeature } from './features/history';
import { AppConfigFeature } from './features/appConfig';

/**
 * Umi v3 compatibility preset for Rsbuild.
 * Orchestrates Umi-specific features using the generic runtime engine.
 *
 * @param umiOptions Optional inline configuration to override .umirc.ts
 */
export const pluginUmi = (
  umiOptions?: Record<string, unknown>,
): RsbuildPlugin => ({
  name: 'rsbuild-plugin-umi',
  setup(api) {
    const root = api.context.rootPath;

    // Suite of features including the AppConfig hook definer
    const features = [
      new RuntimeCoreFeature(),
      new EntryFeature(),
      new AppConfigFeature(),
      new AliasFeature(),
      new RoutesFeature(),
      new UmiHistoryFeature(),
    ] as const;

    // Initialize the manager with the 'umi' namespace
    const manager = new RuntimeManager(api, features, {
      namespace: 'umi',
    });

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      // 1. Resolve configuration (Priority: inline options > config file)
      const umiConfig = umiOptions ?? (await loadUmiConfig(root));

      // 2. Run the orchestration pipeline
      const rsbuildFragment: RsbuildConfig = await manager.execute(umiConfig);

      // 3. Finalize Rsbuild configuration
      return mergeRsbuildConfig(config, rsbuildFragment, {
        resolve: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});
