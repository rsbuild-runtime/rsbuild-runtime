import path from 'node:path';
import type { ResolvedHook } from './Resolver';
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

          if (!relPath.startsWith('.')) {
            relPath = `./${relPath}`;
          }

          imports.push(`import * as ${alias} from '${relPath}';`);
        }
      });
    });

    hookDefinitions.forEach((def) => {
      if (def.key === 'staticExports') return;

      const hooks = resolvedMap.get(def.key) ?? [];
      const callChain = hooks.map((h) => {
        const alias = importMap.get(h.file!);
        return `${alias}.${h.exportName ?? def.key}`;
      });

      const body =
        def.type === 'modify'
          ? `(init: any, args: any) => [${callChain.join(',')}].reduce((m, f) => (typeof f === 'function' ? f(m, args) ?? m : m), init)`
          : `(args: any) => [${callChain.join(',')}].forEach(f => typeof f === 'function' && f(args))`;

      runnerEntries.push(`  ${def.key}: ${body},`);
    });

    return `${imports.join('\n')}\n\nexport const runners = {\n${runnerEntries.join('\n')}\n};\n`;
  }

  public static generateIndex(staticExports: string[]): string {
    const uniqueExports = Array.from(new Set(staticExports));
    return `${uniqueExports.join('\n')}\n`;
  }
}
