import { expect, test, describe } from '@rstest/core';
import { Generator } from '../src/Generator';
import type { ResolvedHook } from '../src/Arbiter';
import type { HookDefinition } from '../src/types';

void describe('Generator', () => {
  const tempDir = '/root/node_modules/.runtime';

  void test('should generate runners with modify (onion) model', () => {
    const hookDefinitions: HookDefinition[] = [
      { key: 'rootContainer', type: 'modify' },
    ];

    const resolvedMap = new Map<string, ResolvedHook[]>();
    resolvedMap.set('rootContainer', [
      { featureId: 'f1', file: '/root/f1.ts', stage: 0 },
      { featureId: 'f2', file: '/root/f2.ts', stage: 10 },
    ]);

    const content = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      tempDir,
    );

    // Verify static imports (relative paths)
    expect(content).toContain("import * as plugin_0 from './../../f1';");
    expect(content).toContain("import * as plugin_1 from './../../f2';");

    // Verify reduce logic for 'modify' type
    expect(content).toContain(
      'return [plugin_0.rootContainer, plugin_1.rootContainer].reduce',
    );
  });

  void test('should generate runners with event model', () => {
    const hookDefinitions: HookDefinition[] = [
      { key: 'onAppMount', type: 'event' },
    ];

    const resolvedMap = new Map<string, ResolvedHook[]>();
    resolvedMap.set('onAppMount', [
      { featureId: 'f1', file: '/root/f1.ts', stage: 0 },
    ]);

    const content = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      tempDir,
    );

    // Verify forEach logic for 'event' type
    expect(content).toContain('[plugin_0.onAppMount].forEach');
    expect(content).not.toContain('.reduce');
  });

  void test('should handle custom export names', () => {
    const hookDefinitions: HookDefinition[] = [{ key: 'hook', type: 'event' }];

    const resolvedMap = new Map<string, ResolvedHook[]>();
    resolvedMap.set('hook', [
      { featureId: 'f1', file: '/root/f1.ts', exportName: 'customFn' },
    ]);

    const content = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      tempDir,
    );

    expect(content).toContain('plugin_0.customFn');
  });

  void test('should generate index with static exports', () => {
    const staticExports = [
      "export { useAuth } from './features/auth';",
      "export { useModel } from './features/model';",
    ];

    const content = Generator.generateIndex(staticExports);

    expect(content).toContain("export { runners } from './runners';");
    expect(content).toContain("export { useAuth } from './features/auth';");
  });

  void test('should normalize windows paths', () => {
    // Manually testing the private-like behavior via input
    const hookDefinitions: HookDefinition[] = [{ key: 'h', type: 'event' }];
    const resolvedMap = new Map<string, ResolvedHook[]>();

    // Simulate Windows absolute path
    resolvedMap.set('h', [{ featureId: 'f', file: 'C:\\root\\f.ts' }]);

    const content = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      'C:\\root\\.runtime',
    );

    // Path should be './../f' (POSIX style) even on Windows
    expect(content).toContain("from './../f'");
    expect(content).not.toContain('\\');
  });
});
