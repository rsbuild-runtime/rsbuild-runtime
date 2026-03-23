import { expect, test, describe, beforeEach } from '@rstest/core';
import { Resolver } from '../src/Resolver';
import type { HookDefinition } from '../src/types';

void describe('Resolver', () => {
  let resolver: Resolver;

  void beforeEach(() => {
    resolver = new Resolver();
  });

  void test('should collect and sort implementations by stage', () => {
    resolver.addIntent('f1', {
      stage: 10,
      implements: { hook: { file: 'f1.ts' } },
    });
    resolver.addIntent('f2', {
      stage: 5,
      implements: { hook: { file: 'f2.ts' } },
    });

    const hooks = resolver.resolve().get('hook');
    expect(hooks).toHaveLength(2);
    expect(hooks![0].featureId).toBe('f2');
    expect(hooks![1].featureId).toBe('f1');
  });

  void test('should handle disableFeatures pruning', () => {
    resolver.addIntent('f1', { implements: { h: { file: '1.ts' } } });
    resolver.addIntent('f2', {
      disableFeatures: ['f1'],
      implements: { h: { file: '2.ts' } },
    });

    const hooks = resolver.resolve().get('h');
    expect(hooks).toHaveLength(1);
    expect(hooks![0].featureId).toBe('f2');
  });

  void test('should handle replace overrides', () => {
    resolver.addIntent('f1', { implements: { h: { file: '1.ts' } } });
    resolver.addIntent('f2', {
      overrides: { h: { mode: 'replace', target: 'f1' } },
      implements: { h: { file: '2.ts' } },
    });

    const hooks = resolver.resolve().get('h');
    expect(hooks).toHaveLength(1);
    expect(hooks![0].featureId).toBe('f2');
  });

  void test('should throw error on undefined hook implementations', () => {
    resolver.addIntent('f1', { implements: { unknown: { file: '1.ts' } } });
    const defs: HookDefinition[] = [{ key: 'known', type: 'event' }];
    expect(() => resolver.validate(defs)).toThrow();
  });
});
