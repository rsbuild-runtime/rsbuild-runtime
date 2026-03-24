import type { RsbuildPlugin, RsbuildConfig } from '@rsbuild/core';
import { RuntimeCoreFeature, RuntimeManager } from 'rsbuild-plugin-runtime';
import { loadUmiConfig } from './UmiConfigLoader';
import { UmiAliasFeature } from './features/alias';
import { UmiRoutesFeature } from './features/routes';
import { UmiEntryFeature } from './features/entry';
import { UmiHistoryFeature } from './features/history';

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

    // Define the suite of features required to replicate Umi v3 behavior
    const features = [
      new RuntimeCoreFeature(),
      new UmiEntryFeature(),
      new UmiAliasFeature(),
      new UmiRoutesFeature(),
      new UmiHistoryFeature(),
    ] as const;

    // Initialize the manager with the 'umi' namespace to ensure compatibility with legacy code
    const manager = new RuntimeManager(api, features, {
      namespace: 'umi',
    });

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      // 1. Resolve configuration (Priority: inline options > config file)
      const umiConfig = umiOptions ?? (await loadUmiConfig(root));

      // 2. Run the orchestration pipeline (Apply -> Arbitrate -> Materialize)
      const rsbuildFragment: RsbuildConfig = await manager.execute(umiConfig);

      // 3. Finalize Rsbuild configuration with dynamic aliases and entry overrides
      return mergeRsbuildConfig(config, rsbuildFragment, {
        resolve: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});
