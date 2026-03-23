import path from 'node:path';
import fs from 'node:fs';
import { mergeRsbuildConfig } from '@rsbuild/core';
import {
  Resolver,
  Materializer,
  Generator,
  VersionManager,
} from '@rsbuild-runtime/core';
import type { RsbuildConfig, RsbuildPluginAPI } from '@rsbuild/core';
import type {
  Feature,
  HookDefinition,
  FeatureResult,
} from '@rsbuild-runtime/core';

export class RuntimeManager {
  private readonly resolver = new Resolver();
  private readonly versionManager: VersionManager;
  private readonly tempDir: string;
  private readonly namespace: string;
  private readonly root: string;

  constructor(
    private readonly api: RsbuildPluginAPI,
    private readonly features: readonly Feature<string, unknown>[],
    options: { tempDir?: string; namespace?: string } = {},
  ) {
    this.root = api.context.rootPath;
    this.namespace = options.namespace ?? '@runtime';
    this.tempDir =
      options.tempDir ?? path.join(this.root, 'node_modules/.runtime');
    this.versionManager = new VersionManager(this.root);
  }

  public async execute(
    userConfig: Record<string, unknown>,
  ): Promise<RsbuildConfig> {
    const hookDefinitions: HookDefinition[] = [];
    let finalRsbuildConfig: RsbuildConfig = {};

    for (const feature of this.features) {
      const featureConfig = (userConfig[feature.key] ?? {}) as unknown;

      const intent = await feature.apply({
        root: this.root,
        config: featureConfig,
        namespace: this.namespace,
        getV: (pkg) => this.versionManager.getV(pkg),
        hasFeature: (id) => this.features.some((f) => f.id === id),
      });

      const result: FeatureResult = {
        ...intent,
        id: feature.id,
      };

      this.resolver.addIntent(feature.id, result);

      if (result.defines) {
        hookDefinitions.push(...result.defines);
      }

      if (result.config) {
        finalRsbuildConfig = mergeRsbuildConfig(
          finalRsbuildConfig,
          result.config,
        );
      }
    }

    this.resolver.validate(hookDefinitions);
    const resolvedMap = this.resolver.resolve();

    resolvedMap.forEach((hooks) => {
      hooks.forEach((hook) => {
        if (hook.content && hook.file) {
          const fullPath = path.isAbsolute(hook.file)
            ? hook.file
            : path.join(this.tempDir, hook.file);
          Materializer.writeIfChanged(fullPath, hook.content);
        }
      });
    });

    const runnersContent = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      this.tempDir,
    );
    Materializer.writeIfChanged(
      path.join(this.tempDir, 'runners.ts'),
      runnersContent,
    );

    const staticExports = (resolvedMap.get('staticExports') ?? []).map(
      (h) => h.content ?? '',
    );
    const indexContent = Generator.generateIndex(staticExports);
    Materializer.writeIfChanged(
      path.join(this.tempDir, 'index.ts'),
      indexContent,
    );

    this.validateTsConfigAlias();

    return finalRsbuildConfig;
  }

  public getRuntimeAlias(): Record<string, string> {
    return {
      '@@': this.tempDir,
      [this.namespace]: path.join(this.tempDir, 'index.ts'),
    };
  }

  private validateTsConfigAlias(): void {
    const tsConfigPath = path.join(this.root, 'tsconfig.json');
    if (!fs.existsSync(tsConfigPath)) return;

    const relTempDir = path
      .relative(this.root, this.tempDir)
      .replace(/\\/g, '/');
    const expectedNamespacePath = `${relTempDir}/index`;
    const expectedInternalPath = `${relTempDir}/*`;

    try {
      const content = fs.readFileSync(tsConfigPath, 'utf-8');
      const hasValidNamespace =
        content.includes(`"${this.namespace}"`) &&
        content.includes(expectedNamespacePath);
      const hasValidInternal =
        content.includes('"@@/*"') && content.includes(expectedInternalPath);

      if (!hasValidNamespace || !hasValidInternal) {
        this.api.logger.info(
          `[Runtime] Tip: Configuration for namespace "${this.namespace}" or "@@/*" is missing or points to an old directory.\n` +
            'Please update the "paths" in your tsconfig.json to include:\n' +
            '{\n  "compilerOptions": {\n    "paths": {\n' +
            `      "${this.namespace}": ["./${relTempDir}/index.ts"],\n` +
            `      "@@/*": ["./${relTempDir}/*"]\n` +
            '    }\n  }\n}',
        );
      }
    } catch {
      // Ignore read errors
    }
  }
}
