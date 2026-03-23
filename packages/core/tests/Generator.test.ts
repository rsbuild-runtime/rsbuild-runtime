import { expect, test, describe } from '@rstest/core';
import { Generator } from '../src/Generator';
import type { ResolvedHook } from '../src/Resolver';
import type { HookDefinition } from '../src/types';

void describe('Generator', () => {
  const tempDir = '/root/node_modules/.runtime';

  void test('should generate runners with POSIX relative paths', () => {
    const defs: HookDefinition[] = [{ key: 'h', type: 'modify' }];
    const map = new Map<string, ResolvedHook[]>();
    map.set('h', [{ featureId: 'f', file: '/root/f.ts', stage: 0 }]);

    const content = Generator.generateRunners(map, defs, tempDir);
    expect(content).toContain("import * as plugin_0 from './../../f';");
    expect(content).toContain('h: (init, args) => [plugin_0.h].reduce');
  });

  void test('should deduplicate exports in index', () => {
    const exports = ["export { a } from './a';", "export { a } from './a';"];
    const content = Generator.generateIndex(exports);
    const matches = content.match(/export { a }/g);
    expect(matches).toHaveLength(1);
  });

  void test('should handle modify strategy with defensive return', () => {
    const defs: HookDefinition[] = [{ key: 'h', type: 'modify' }];
    const map = new Map<string, ResolvedHook[]>();
    map.set('h', [{ featureId: 'f', file: '/root/f.ts' }]);

    const content = Generator.generateRunners(map, defs, tempDir);
    expect(content).toContain('f(m, args) ?? m');
  });
});
