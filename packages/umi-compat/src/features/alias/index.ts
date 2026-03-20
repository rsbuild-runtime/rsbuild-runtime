import path from 'node:path';
import { Feature } from '@rsbuild-runtime/core';
import type { FeatureParams, FeatureResult } from '@rsbuild-runtime/core';

export class UmiAliasFeature extends Feature<'alias', Record<string, string>> {
  constructor() {
    super('alias');
  }

  public apply({ root }: FeatureParams<Record<string, string>>): FeatureResult {
    return {
      config: {
        source: {
          alias: {
            '@': path.join(root, 'src'),
          },
        },
      },
    };
  }
}
