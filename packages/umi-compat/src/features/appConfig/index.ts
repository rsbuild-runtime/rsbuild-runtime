import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createJiti } from 'jiti';
import { Feature } from '@rsbuild-runtime/core';
import type { RuntimeIntent, FeatureParams } from '@rsbuild-runtime/core';

export class UmiAppConfigFeature extends Feature {
  constructor() {
    super('__umi_app_config__');
  }

  public async apply({ root }: FeatureParams<unknown>): Promise<RuntimeIntent> {
    const bridgeFile = 'features/app.ts';
    const possibleAppFiles = ['src/app.tsx', 'src/app.ts', 'src/app.jsx', 'src/app.js'];
    const appFile = possibleAppFiles.find((file) => existsSync(join(root, file)));

    let exportedHooks: string[] = [];

    if (appFile) {
      const appAbsPath = join(root, appFile);
      const jiti = createJiti(import.meta.url, {
        interopDefault: true,
        fsCache: false,
        moduleCache: false,
        // Ensure we don't execute browser-only code that might break Node
        alias: {
          // Optional: mock browser-only imports if needed
        },
      });

      try {
        const appModule = await jiti.import<Record<string, unknown>>(appAbsPath, {
          default: true,
        });
        exportedHooks = Object.keys(appModule);
      } catch (err) {
        // Fallback: if execution fails (due to browser globals), 
        // the bridge will still be generated but might be empty.
        console.warn(`[Runtime] Failed to parse ${appFile} via jiti: ${String(err)}`);
      }
    }

    const hasOnRouteChange = exportedHooks.includes('onRouteChange');
    const hasPatchRoutes = exportedHooks.includes('patchRoutes');

    const appImportCode = appFile ? "import * as app from '@/app';" : '';

    return {
      defines: [
        {
          key: 'onRouteChange',
          type: 'event',
          description: 'Fired when the route changes',
        },
        {
          key: 'patchRoutes',
          type: 'event',
          description: 'Allows modifying routes at runtime',
        },
      ],
      files: [
        {
          path: bridgeFile,
          content: `
// @ts-nocheck
${appImportCode}

export const onRouteChange = (args: unknown): void => {
  ${hasOnRouteChange ? 'app.onRouteChange(args);' : '// No onRouteChange'}
};

export const patchRoutes = (args: unknown): void => {
  ${hasPatchRoutes ? 'app.patchRoutes(args);' : '// No patchRoutes'}
};
          `.trim() + '\n',
        },
      ],
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
