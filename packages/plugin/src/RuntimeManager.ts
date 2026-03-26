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

  public async execute(
    userConfig: Record<string, unknown>,
  ): Promise<RsbuildConfig> {
    const hookDefinitions: HookDefinition[] = [];
    const standaloneFiles: OutputFile[] = [];
    const aggregatedDeps: Record<string, string> = {};
    let finalRsbuildConfig: RsbuildConfig = {};

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

      const result: FeatureResult = { ...intent, id: feature.id };
      this.resolver.addIntent(feature.id, result);

      if (intent.files) standaloneFiles.push(...intent.files);
      if (result.defines) hookDefinitions.push(...result.defines);
      if (result.runtimeDeps) Object.assign(aggregatedDeps, result.runtimeDeps);
      if (result.config) {
        finalRsbuildConfig = mergeRsbuildConfig(
          finalRsbuildConfig,
          result.config,
        );
      }
    }

    await this.validateRuntimeDeps(aggregatedDeps);

    this.resolver.validate(hookDefinitions);
    const resolvedMap = this.resolver.resolve();

    for (const file of standaloneFiles) {
      const fullPath = path.isAbsolute(file.path)
        ? file.path
        : path.join(this.tempDir, file.path);
      Materializer.writeIfChanged(fullPath, file.content);
    }

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

    Materializer.writeIfChanged(
      path.join(this.tempDir, 'runners.ts'),
      Generator.generateRunners(resolvedMap, hookDefinitions, this.tempDir),
    );

    const staticExports = (resolvedMap.get('staticExports') ?? []).map(
      (h: ResolvedHook) => h.content ?? '',
    );
    Materializer.writeIfChanged(
      path.join(this.tempDir, 'index.ts'),
      Generator.generateIndex(staticExports),
    );

    this.validateTsConfigAlias();
    return finalRsbuildConfig;
  }

  private async validateRuntimeDeps(
    deps: Record<string, string>,
  ): Promise<void> {
    if (Object.keys(deps).length === 0) return;

    // Stage 1: Sync Fast Check
    const syncResults = this.versionManager.checkDependencies({
      manifest: deps,
    });
    if (syncResults.every((r) => r.isSatisfied)) return;

    // Stage 2: Async Deep Audit
    const asyncResults = await this.versionManager.checkDependencies({
      manifest: deps,
      fetchRemote: true,
    });

    const RED = '\x1b[31m';
    const GREEN = '\x1b[32m';
    const CYAN = '\x1b[36m';
    const BOLD = '\x1b[1m';
    const RESET = '\x1b[0m';

    const errorLogs = asyncResults
      .filter((r) => !r.isSatisfied)
      .map((r) => {
        const actualMsg = r.actual ? `(found ${r.actual})` : '(not installed)';
        return `   ${RED}✖${RESET} ${r.name}: expected ${CYAN}${r.expected}${RESET} ${actualMsg}`;
      });

    const { name: pkgManager, command: pkgCmd } =
      this.versionManager.getPackageManager();
    const suggestions = asyncResults
      .filter((r) => !r.isSatisfied)
      .map((r) => r.suggestion);
    const installCmd = `${pkgManager} ${pkgCmd} ${suggestions.join(' ')}`;

    const message =
      `\n[Runtime] Dependency validation failed:\n${errorLogs.join('\n')}\n\n` +
      `👉 ${CYAN}Please run the following command in your project root:${RESET}\n` +
      `   ${BOLD}Dir:  ${this.root}${RESET}\n` +
      `   ${BOLD}Cmd:  ${GREEN}${installCmd}${RESET}\n`;

    this.api.logger.error(message);
    throw new Error('Runtime dependency validation failed.');
  }

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
