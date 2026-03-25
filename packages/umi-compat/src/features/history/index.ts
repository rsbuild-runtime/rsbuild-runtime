import { join } from 'node:path';
import { Feature } from '@rsbuild-runtime/core';
import type { RuntimeIntent, FeatureParams } from '@rsbuild-runtime/core';
import type {
  BrowserHistoryBuildOptions,
  HashHistoryBuildOptions,
  MemoryHistoryBuildOptions,
} from 'history';

export type HistoryType = 'browser' | 'hash' | 'memory';

export type HistoryConfig =
  | HistoryType
  | {
      type?: HistoryType;
      options?:
        | BrowserHistoryBuildOptions
        | HashHistoryBuildOptions
        | MemoryHistoryBuildOptions;
    };

export class UmiHistoryFeature extends Feature<'history', HistoryConfig> {
  constructor() {
    super('history');
  }

  public apply(params: FeatureParams<HistoryConfig>): RuntimeIntent {
    const { config, allConfig, getRequirements } = params;

    // 1. Audit runtime dependencies autonomously
    const pkgPath = join(import.meta.dirname, '../../../package.json');
    const runtimeDeps = getRequirements(['history'], pkgPath);

    // 2. Normalize configuration
    const normalizedConfig =
      typeof config === 'string' ? { type: config } : config;

    const type = normalizedConfig?.type ?? 'browser';

    const CREATORS = {
      browser: 'createBrowserHistory',
      hash: 'createHashHistory',
      memory: 'createMemoryHistory',
    } as const;

    const creator = CREATORS[type];

    // 3. Extract and normalize options
    const rawOptions =
      normalizedConfig &&
      typeof normalizedConfig === 'object' &&
      'options' in normalizedConfig &&
      normalizedConfig.options
        ? normalizedConfig.options
        : {};

    const options: Record<string, unknown> = {
      ...(rawOptions as Record<string, unknown>),
    };

    // Umi v3 Integration: inherit 'base' as 'basename' if not explicitly provided
    if (!options.basename && typeof allConfig.base === 'string') {
      options.basename = allConfig.base;
    }

    const optionsStr =
      Object.keys(options).length > 0 ? JSON.stringify(options) : '';

    const content = `
import { ${creator} } from 'history';
export const history = ${creator}(${optionsStr});
`.trim();

    return {
      runtimeDeps, // Submit requirement to the engine for validation
      files: [{ path: 'history.ts', content }],
      implements: {
        staticExports: {
          content: "export { history } from './history';",
        },
      },
    };
  }
}
