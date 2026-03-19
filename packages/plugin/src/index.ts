import type { RsbuildPlugin } from '@rsbuild/core';
import { Arbiter } from '@rsbuild-runtime/core';
import { createJiti } from 'jiti';
import path from 'node:path';

export const pluginRuntime = (options: unknown = {}): RsbuildPlugin => ({
  name: 'rsbuild-plugin-runtime',
  setup(api) {
    const root = api.context.rootPath;
    const tempDir = path.join(root, 'node_modules/.runtime');

    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      // 1. 加载配置 (示例逻辑)
      const jiti = createJiti(root);
      const umiConfig = await jiti.import(path.join(root, '.umirc.ts'));

      // 2. 初始化仲裁器
      const arbiter = new Arbiter();

      // TODO: 这里将来会遍历加载所有的 Features
      // const res = await someFeature.apply({ root, config: umiConfig[someFeature.key], getV: ... });
      // arbiter.addResult(someFeature.id, res);

      // 3. 执行仲裁并修改配置
      const resolved = arbiter.resolve();

      return mergeRsbuildConfig(config, {
        source: {
          alias: {
            '@@': tempDir,
            umi: path.join(tempDir, 'index.ts'),
          },
        },
      });
    });
  },
});
