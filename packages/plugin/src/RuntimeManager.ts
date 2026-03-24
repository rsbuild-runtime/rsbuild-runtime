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
  OutputFile,
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

  /**
   * Orchestrates the runtime generation pipeline.
   * 1. Collects intents from features.
   * 2. Resolves conflicts via Resolver.
   * 3. Materializes physical files and internal modules.
   */
  public async execute(
    userConfig: Record<string, unknown>,
  ): Promise<RsbuildConfig> {
    const hookDefinitions: HookDefinition[] = [];
    const standaloneFiles: OutputFile[] = [];
    let finalRsbuildConfig: RsbuildConfig = {};

    // Phase 1: Collection
    for (const feature of this.features) {
      const featureConfig = (userConfig[feature.key] ?? {}) as unknown;

      const intent = await feature.apply({
        root: this.root,
        config: featureConfig,
        allConfig: userConfig,
        namespace: this.namespace,
        tempDir: this.tempDir,
        getV: (pkg) => this.versionManager.getV(pkg),
        hasFeature: (id) => this.features.some((f) => f.id === id),
      });

      const result: FeatureResult = {
        ...intent,
        id: feature.id,
      };

      this.resolver.addIntent(feature.id, result);

      if (intent.files) {
        standaloneFiles.push(...intent.files);
      }

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

    // Phase 2: Orchestration
    this.resolver.validate(hookDefinitions);
    const resolvedMap = this.resolver.resolve();

    // Phase 3: Materialization
    // A. Write standalone files defined by features
    for (const file of standaloneFiles) {
      const fullPath = path.isAbsolute(file.path)
        ? file.path
        : path.join(this.tempDir, file.path);
      Materializer.writeIfChanged(fullPath, file.content);
    }

    // B. Write individual orchestrated hook implementations
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

    // C. Generate Runners (Logic and interface are now in one file)
    const runnersContent = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      this.tempDir,
    );
    Materializer.writeIfChanged(
      path.join(this.tempDir, 'runners.ts'),
      runnersContent,
    );

    // D. Generate Public API Index
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

  /**
   * Provides necessary aliases for internal modules and the public entry.
   */
  public getRuntimeAlias(): Record<string, string> {
    return {
      '@@': this.tempDir,
      [this.namespace]: path.join(this.tempDir, 'index.ts'),
    };
  }

  /**
   * Validates if the project's tsconfig.json is properly configured for the runtime.
   */
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
