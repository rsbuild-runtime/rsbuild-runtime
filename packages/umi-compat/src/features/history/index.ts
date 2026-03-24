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
    const { config, allConfig } = params;

    const normalizedConfig =
      typeof config === 'string' ? { type: config } : config;
    const type = normalizedConfig?.type ?? 'browser';

    const CREATORS = {
      browser: 'createBrowserHistory',
      hash: 'createHashHistory',
      memory: 'createMemoryHistory',
    } as const;

    const creator = CREATORS[type];

    // Ensure options is always a valid object to avoid ts(2769)
    const rawOptions =
      normalizedConfig &&
      typeof normalizedConfig === 'object' &&
      'options' in normalizedConfig
        ? normalizedConfig.options
        : {};

    const options: Record<string, unknown> = { ...rawOptions };

    // Umi v3 Integration: inherit 'base' as 'basename' if not explicitly provided
    if (!options.basename && typeof allConfig?.base === 'string') {
      options.basename = allConfig.base;
    }

    const optionsStr =
      Object.keys(options).length > 0 ? JSON.stringify(options) : '';

    const content = `
import { ${creator} } from 'history';
export const history = ${creator}(${optionsStr});
`.trim();

    return {
      files: [{ path: 'history.ts', content }],
      implements: {
        staticExports: {
          content: "export { history } from './history';",
        },
      },
    };
  }
}
