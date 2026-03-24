import { existsSync } from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';

const UMI_CONFIG_FILES = [
  '.umirc.ts',
  '.umirc.js',
  'config/config.ts',
  'config/config.js',
];

/**
 * Scans and loads Umi configuration files using jiti.
 * Supports TS, ESM, and CJS formats with zero caching for reliable HMR.
 */
export async function loadUmiConfig(
  root: string,
): Promise<Record<string, unknown>> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    fsCache: false,
    moduleCache: false,
  });

  for (const file of UMI_CONFIG_FILES) {
    const configPath = path.join(root, file);
    if (existsSync(configPath)) {
      const mod = await jiti.import(configPath);
      // Defensive check for default export or the module object itself
      const config = (mod as { default?: unknown })?.default ?? mod;
      return (config || {}) as Record<string, unknown>;
    }
  }

  return {};
}
