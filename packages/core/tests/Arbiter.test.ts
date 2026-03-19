import { expect, test, describe, beforeEach } from '@rstest/core';
import { Arbiter } from '../src/Arbiter';
import type { FeatureResult } from '../src/types';

void describe('Arbiter', () => {
  let arbiter: Arbiter;

  void beforeEach(() => {
    arbiter = new Arbiter();
  });

  void test('should collect and sort implementations by stage', () => {
    const f1: FeatureResult = {
      stage: 10,
      implements: {
        hook: { file: 'f1.ts' },
      },
    };
    const f2: FeatureResult = {
      stage: 5,
      implements: {
        hook: { file: 'f2.ts' },
      },
    };

    arbiter.addResult('f1', f1);
    arbiter.addResult('f2', f2);

    const resolved = arbiter.resolve();
    const hooks = resolved.get('hook');

    expect(hooks).toHaveLength(2);
    expect(hooks![0].featureId).toBe('f2');
    expect(hooks![1].featureId).toBe('f1');
  });

  void test('should handle disableFeatures pruning', () => {
    const f1: FeatureResult = {
      implements: { hook: { file: 'f1.ts' } },
    };
    const f2: FeatureResult = {
      disableFeatures: ['f1'],
      implements: { hook: { file: 'f2.ts' } },
    };

    arbiter.addResult('f1', f1);
    arbiter.addResult('f2', f2);

    const resolved = arbiter.resolve();
    const hooks = resolved.get('hook');

    expect(hooks).toHaveLength(1);
    expect(hooks![0].featureId).toBe('f2');
  });

  void test('should handle overrides with replace mode', () => {
    const f1: FeatureResult = {
      implements: { hook: { file: 'f1.ts' } },
    };
    const f2: FeatureResult = {
      overrides: {
        hook: { mode: 'replace', target: 'f1' },
      },
      implements: { hook: { file: 'f2.ts' } },
    };

    arbiter.addResult('f1', f1);
    arbiter.addResult('f2', f2);

    const resolved = arbiter.resolve();
    const hooks = resolved.get('hook');

    expect(hooks).toHaveLength(1);
    expect(hooks![0].featureId).toBe('f2');
  });

  void test('should prioritize local stage over global stage', () => {
    const f1: FeatureResult = {
      stage: 0,
      implements: {
        hook: { file: 'f1.ts', stage: 100 },
      },
    };
    const f2: FeatureResult = {
      stage: 50,
      implements: {
        hook: { file: 'f2.ts' },
      },
    };

    arbiter.addResult('f1', f1);
    arbiter.addResult('f2', f2);

    const resolved = arbiter.resolve();
    const hooks = resolved.get('hook');

    expect(hooks![0].featureId).toBe('f2');
    expect(hooks![1].featureId).toBe('f1');
  });
});
