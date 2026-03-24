import type { RuntimeIntent } from '@rsbuild-runtime/core';
import { Feature } from '@rsbuild-runtime/core';

export class UmiAppConfigFeature extends Feature {
  public apply(): RuntimeIntent {
    const bridgeFile = 'features/app/bridge.ts';

    return {
      defines: [
        { key: 'onRouteChange', type: 'event' },
        { key: 'patchRoutes', type: 'event' },
      ],
      // 1. 先生成一个聚合了所有逻辑的静态文件
      files: [
        {
          path: bridgeFile,
          content: `
import * as app from '@/app';

export const onRouteChange = (args: any) => {
  if (typeof app.onRouteChange === 'function') app.onRouteChange(args);
};

export const patchRoutes = (args: any) => {
  if (typeof app.patchRoutes === 'function') app.patchRoutes(args);
};`.trim(),
        },
      ],
      // 2. 让钩子实现指向这个已存在的文件，而不提供 content（避免触发 Materializer 写入）
      implements: {
        onRouteChange: {
          file: bridgeFile,
          exportName: 'onRouteChange',
        },
        patchRoutes: {
          file: bridgeFile,
          exportName: 'patchRoutes',
        },
      },
    };
  }
}
