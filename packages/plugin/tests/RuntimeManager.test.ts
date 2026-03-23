import { expect, test, describe, beforeEach, afterEach } from '@rstest/core';
import { vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { Feature } from '@rsbuild-runtime/core';
import type { RuntimeIntent } from '@rsbuild-runtime/core';
import type { RsbuildPluginAPI } from '@rsbuild/core';
import { RuntimeManager } from '../src/RuntimeManager';

const TMP_DIR = path.join(__dirname, '.tmp_runtime');

class MockFeature extends Feature<'mock', { val: string }> {
  constructor() {
    super('mock');
  }

  public apply(): RuntimeIntent {
    return {
      // Must define hooks before implementing them to pass Resolver validation
      defines: [
        { key: 'staticExports', type: 'modify' },
        { key: 'rootContainer', type: 'modify' },
      ],
      config: { resolve: { alias: { '@mock': 'src/mock' } } },
      implements: {
        staticExports: {
          content: "export const val = 'mock';",
        },
        rootContainer: {
          file: 'mock-runtime.ts',
          content: 'export const rootContainer = (c) => c;',
        },
      },
    };
  }
}

void describe('RuntimeManager', () => {
  let mockApi: RsbuildPluginAPI;

  void beforeEach(() => {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    mockApi = {
      context: { rootPath: TMP_DIR },
      getRsbuildConfig: vi.fn().mockReturnValue({}),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
      },
    } as unknown as RsbuildPluginAPI;
  });

  void afterEach(() => {
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  void test('should execute pipeline and materialize files', async () => {
    const manager = new RuntimeManager(mockApi, [new MockFeature()], {
      tempDir: TMP_DIR,
      namespace: 'umi',
    });

    const rsbuildConfig = await manager.execute({ mock: { val: 'test' } });

    expect(rsbuildConfig.resolve?.alias).toMatchObject({ '@mock': 'src/mock' });

    expect(fs.existsSync(path.join(TMP_DIR, 'mock-runtime.ts'))).toBe(true);
    expect(fs.existsSync(path.join(TMP_DIR, 'runners.ts'))).toBe(true);
    expect(fs.existsSync(path.join(TMP_DIR, 'index.ts'))).toBe(true);

    const indexContent = fs.readFileSync(
      path.join(TMP_DIR, 'index.ts'),
      'utf-8',
    );
    expect(indexContent).toContain("export const val = 'mock';");
    expect(indexContent).toContain("export { runners } from './runners';");
  });

  void test('should generate correct aliases', () => {
    const manager = new RuntimeManager(mockApi, [], {
      tempDir: TMP_DIR,
      namespace: 'custom_ns',
    });

    const alias = manager.getRuntimeAlias();
    expect(alias['@@']).toBe(TMP_DIR);
    expect(alias['custom_ns']).toBe(path.join(TMP_DIR, 'index.ts'));
  });
});
