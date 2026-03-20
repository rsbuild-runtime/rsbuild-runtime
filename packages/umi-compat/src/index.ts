import type { RsbuildPlugin } from '@rsbuild/core';
import { RuntimeManager } from 'rsbuild-plugin-runtime';
import { loadUmiConfig } from './UmiConfigLoader';
import { UmiAliasFeature } from './features/alias';

export const pluginUmi = (): RsbuildPlugin => ({
  name: 'rsbuild-plugin-umi',
  setup(api) {
    const root = api.context.rootPath;

    // 静态注册 Umi 特性列表
    const features = [new UmiAliasFeature()] as const;

    // 初始化运行时管理器
    const manager = new RuntimeManager(api, features);

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      // 在配置修改阶段动态加载 .umirc.ts
      const umiConfig = await loadUmiConfig(root);

      // 执行机制层的引擎逻辑
      const rsbuildFragment = await manager.execute(
        umiConfig,
        mergeRsbuildConfig,
      );

      // 合并配置并应用别名
      return mergeRsbuildConfig(config, rsbuildFragment, {
        source: {
          alias: manager.getRuntimeAlias(),
        },
      });
    });
  },
});
