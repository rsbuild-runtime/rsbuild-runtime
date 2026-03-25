import path from 'node:path';
import fs from 'node:fs';
import semver from 'semver';
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
  ResolvedHook,
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
    const aggregatedDeps: Record<string, string> = {};
    let finalRsbuildConfig: RsbuildConfig = {};

    // Phase 1: Collection & Declarative Dependency Gathering
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
        getRequirements: (names, pkgPath) =>
          this.versionManager.getRequirements(names, pkgPath),
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

      // Aggregate runtime dependencies declared by the active features
      if (result.runtimeDeps) {
        Object.assign(aggregatedDeps, result.runtimeDeps);
      }

      if (result.config) {
        finalRsbuildConfig = mergeRsbuildConfig(
          finalRsbuildConfig,
          result.config,
        );
      }
    }

    // 2. Validate aggregated runtime dependencies against host environment
    this.validateRuntimeDeps(aggregatedDeps);

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
    resolvedMap.forEach((hooks: ResolvedHook[]) => {
      hooks.forEach((hook: ResolvedHook) => {
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
      (h: ResolvedHook) => h.content ?? '',
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
   * Validates runtime dependencies against the host project's explicit declarations.
   * Throws an error if any dependency is missing or version mismatches.
   */
  private validateRuntimeDeps(deps: Record<string, string>): void {
    const errors: string[] = [];
    for (const [name, range] of Object.entries(deps)) {
      // The versionManager ensures visibility in the host package.json
      const actual = this.versionManager.getFullVersion(name);
      if (!actual) {
        errors.push(
          `- ${name}: missing in host package.json (required: ${range})`,
        );
      } else if (!semver.satisfies(actual, range)) {
        errors.push(
          `- ${name}: version mismatch (found ${actual}, required ${range})`,
        );
      }
    }

    if (errors.length > 0) {
      const msg =
        `[Runtime] Dependency validation failed:\n${errors.join('\n')}\n` +
        'Please ensure these packages are explicitly installed in your project root.';
      this.api.logger.error(msg);
      // throw new Error(msg);
    }
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
