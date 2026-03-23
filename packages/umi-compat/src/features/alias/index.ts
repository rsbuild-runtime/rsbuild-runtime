import { Feature } from '@rsbuild-runtime/core';
import type { RuntimeIntent } from '@rsbuild-runtime/core';

export class UmiAliasFeature extends Feature<'alias', Record<string, string>> {
  constructor() {
    super('alias');
  }

  public apply(): RuntimeIntent {
    return {
      config: {},
    };
  }
}
