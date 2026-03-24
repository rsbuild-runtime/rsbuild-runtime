import path from 'node:path';
import { Feature } from '@rsbuild-runtime/core';
import type { FeatureParams, RuntimeIntent } from '@rsbuild-runtime/core';

export class UmiEntryFeature extends Feature {
  constructor() {
    super('__umi_entry__');
  }

  public apply({ getV, tempDir }: FeatureParams<unknown>): RuntimeIntent {
    const isReact18 = getV('react-dom') >= 18;

    const content = `// @ts-nocheck
import React from 'react';
import ${isReact18 ? 'ReactDOM from "react-dom/client"' : 'ReactDOM from "react-dom"'};
import { runners } from './runners';

async function bootstrap() {
  const rootContainer = runners.rootContainer(null, {}) as React.ReactElement;
  const mountNode = document.getElementById('root');
  if (!mountNode) return;

  ${
    isReact18
      ? 'ReactDOM.createRoot(mountNode).render(rootContainer);'
      : 'ReactDOM.render(rootContainer, mountNode);'
  }
}

bootstrap().catch(console.error);
    `.trim();

    return {
      config: {
        source: {
          entry: { index: path.join(tempDir, 'entry.tsx') },
        },
      },
      files: [{ path: 'entry.tsx', content }],
      implements: {
        // Only provide definitions if necessary, but don't re-export runners here
        // as RuntimeCoreFeature already handles it.
      },
    };
  }
}
