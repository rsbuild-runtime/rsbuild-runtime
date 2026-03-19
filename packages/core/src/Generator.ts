import path from 'node:path';
import type { ResolvedHook } from './Arbiter';
import type { HookDefinition } from './types';

export class Generator {
  public static generateRunners(
    resolvedMap: Map<string, ResolvedHook[]>,
    hookDefinitions: HookDefinition[],
    tempDir: string,
  ): string {
    const imports: string[] = [];
    const runnerEntries: string[] = [];
    const importMap = new Map<string, string>();

    let aliasCounter = 0;
    resolvedMap.forEach((hooks) => {
      for (const hook of hooks) {
        if (!importMap.has(hook.file)) {
          const alias = `plugin_${aliasCounter++}`;
          importMap.set(hook.file, alias);
          // Path Consistency: Normalize to POSIX for imports
          const relativePath = this.normalizePath(
            path.relative(tempDir, hook.file).replace(/\.[jt]sx?$/, ''),
          );
          imports.push(`import * as ${alias} from './${relativePath}';`);
        }
      }
    });

    hookDefinitions.forEach((def) => {
      const implementations = resolvedMap.get(def.key) || [];
      const fnName = def.key;
      const callChain = implementations.map((impl) => {
        const alias = importMap.get(impl.file);
        return `${alias}.${impl.exportName ?? def.key}`;
      });

      if (def.type === 'modify') {
        // Runtime Robustness: Defensive Onion Model
        runnerEntries.push(`
  ${fnName}: (initialValue, args) => {
    return [${callChain.join(', ')}].reduce((memo, fn) => {
      if (typeof fn !== 'function') return memo;
      const nextMemo = fn(memo, args);
      return nextMemo === undefined ? memo : nextMemo;
    }, initialValue);
  },`);
      } else {
        runnerEntries.push(`
  ${fnName}: (args) => {
    [${callChain.join(', ')}].forEach(fn => {
      if (typeof fn === 'function') fn(args);
    });
  },`);
      }
    });

    return `${imports.join('\n')}\n\nexport const runners = {${runnerEntries.join('\n')}\n};`.trim();
  }

  /**
   * Updated: Static Export Conflict Detection
   */
  public static generateIndex(staticExports: string[]): string {
    const exportLines = Array.from(new Set(staticExports)); // Basic deduplication
    return `export { runners } from './runners';\n${exportLines.join('\n')}`.trim();
  }

  private static normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
  }
}
