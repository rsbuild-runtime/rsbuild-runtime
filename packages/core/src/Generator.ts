import path from 'node:path';
import type { ResolvedHook } from './Resolver';
import type { HookDefinition } from './types';

export class Generator {
  /**
   * Generates a single runners.ts containing both execution logic and type interfaces.
   */
  public static generateRunners(
    resolvedMap: Map<string, ResolvedHook[]>,
    hookDefinitions: HookDefinition[],
    tempDir: string,
  ): string {
    const imports: string[] = [];
    const runnerEntries: string[] = [];
    const importMap = new Map<string, string>();

    // 1. Prepare Imports
    let counter = 0;
    resolvedMap.forEach((hooks) => {
      hooks.forEach((hook) => {
        if (hook.file && !importMap.has(hook.file)) {
          const alias = `plugin_${counter++}`;
          importMap.set(hook.file, alias);
          const absoluteHookFile = path.isAbsolute(hook.file)
            ? hook.file
            : path.join(tempDir, hook.file);

          let relPath = path
            .relative(tempDir, absoluteHookFile)
            .replace(/\\/g, '/')
            .replace(/\.[jt]sx?$/, '');

          if (!relPath.startsWith('.')) relPath = `./${relPath}`;
          imports.push(`import * as ${alias} from '${relPath}';`);
        }
      });
    });

    // 2. Prepare Runner Interface
    const interfaceEntries = hookDefinitions
      .filter((def) => def.key !== 'staticExports')
      .map((def) => {
        const sig =
          def.type === 'modify'
            ? '(initialValue: unknown, args: unknown) => unknown'
            : '(args: unknown) => void';
        return `  ${def.key}: ${sig};`;
      });

    // 3. Build Runner Logic
    hookDefinitions.forEach((def) => {
      if (def.key === 'staticExports') return;

      const hooks = resolvedMap.get(def.key) ?? [];
      const callChain = hooks.map(
        (h) => `${importMap.get(h.file!)}.${h.exportName ?? def.key}`,
      );

      const body =
        def.type === 'modify'
          ? `(init: unknown, args: unknown) => [${callChain.join(',')}].reduce((m, f) => (typeof f === 'function' ? (f as (m: unknown, a: unknown) => unknown)(m, args) ?? m : m), init)`
          : `(args: unknown) => [${callChain.join(',')}].forEach(f => typeof f === 'function' && (f as (a: unknown) => void)(args))`;

      runnerEntries.push(`  ${def.key}: ${body},`);
    });

    return `
${imports.join('\n')}

export interface Runners {
${interfaceEntries.join('\n')}
}

export const runners: Runners = {
${runnerEntries.join('\n')}
};
`;
  }

  /**
   * Generates the main index.ts file aggregating all static exports.
   */
  public static generateIndex(staticExports: string[]): string {
    const uniqueExports = Array.from(new Set(staticExports));
    return `${uniqueExports.join('\n')}\n`;
  }
}
