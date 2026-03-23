import { Feature } from '@rsbuild-runtime/core';
import type { RuntimeIntent } from '@rsbuild-runtime/core';

export class RuntimeCoreFeature extends Feature {
  constructor() {
    super('__core__');
  }

  public apply(): RuntimeIntent {
    return {
      defines: [
        {
          key: 'staticExports',
          type: 'modify',
          description: 'Global API exports for index.ts',
        },
        {
          key: 'rootContainer',
          type: 'modify',
          description: 'The root React container wrapper',
        },
      ],
      implements: {
        staticExports: {
          content: "export { runners } from './runners';",
          stage: -9999,
        },
      },
    };
  }
}
