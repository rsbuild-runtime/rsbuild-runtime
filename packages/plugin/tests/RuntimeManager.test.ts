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
          content: 'export const rootContainer = (c: unknown) => c;',
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
    vi.restoreAllMocks();
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
  });

  void describe('peer dependency validation', () => {
    void test('should log warning when peer dependency is missing', async () => {
      const mockPluginPkg = JSON.stringify({
        peerDependencies: { 'missing-pkg': '^1.0.0' },
      });

      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (typeof p === 'string' && p.endsWith('package.json')) {
          return mockPluginPkg;
        }
        return '';
      });
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const manager = new RuntimeManager(mockApi, []);
      await manager.execute({});

      expect(mockApi.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing (required range: ^1.0.0)'),
      );
    });

    void test('should log warning when peer dependency version mismatches', async () => {
      const mockPluginPkg = JSON.stringify({
        peerDependencies: { react: '^18.0.0' },
      });
      const mockHostPkg = JSON.stringify({ version: '17.0.2' });

      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        const pathStr = typeof p === 'string' ? p : '';
        if (pathStr.includes('plugin') && pathStr.endsWith('package.json')) {
          return mockPluginPkg;
        }
        if (pathStr.includes('react') && pathStr.endsWith('package.json')) {
          return mockHostPkg;
        }
        return '';
      });
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const manager = new RuntimeManager(mockApi, []);
      await manager.execute({});

      expect(mockApi.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('expected ^18.0.0, but found 17.0.2'),
      );
    });
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
