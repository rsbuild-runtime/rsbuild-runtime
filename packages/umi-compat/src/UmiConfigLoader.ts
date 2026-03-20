import { existsSync } from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';

const UMI_CONFIG_FILES = [
  '.umirc.ts',
  '.umirc.js',
  'config/config.ts',
  'config/config.js',
];

export async function loadUmiConfig(
  root: string,
): Promise<Record<string, unknown>> {
  // createJiti 返回一个具备类型约束的实例
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    fsCache: false,
    moduleCache: false,
  });

  for (const file of UMI_CONFIG_FILES) {
    const configPath = path.join(root, file);
    if (existsSync(configPath)) {
      const mod = await jiti.import(configPath);
      // 对导入的内容进行防御性检查并断言类型
      const config = (mod as { default?: unknown })?.default ?? mod;
      return (config || {}) as Record<string, unknown>;
    }
  }

  return {};
}
