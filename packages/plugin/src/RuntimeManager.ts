import path from 'node:path';
import {
  Arbiter,
  Materializer,
  Generator,
  VersionManager,
} from '@rsbuild-runtime/core';
import type { RsbuildConfig, RsbuildPluginAPI } from '@rsbuild/core';
import type { Feature, HookDefinition } from '@rsbuild-runtime/core';

export class RuntimeManager {
  private readonly arbiter = new Arbiter();
  private readonly versionManager: VersionManager;
  private readonly tempDir: string;
  private readonly root: string;

  constructor(
    private readonly api: RsbuildPluginAPI,
    private readonly features: readonly Feature<string, unknown>[],
    tempDir?: string,
  ) {
    this.root = api.context.rootPath;
    this.tempDir = tempDir ?? path.join(this.root, 'node_modules/.runtime');
    this.versionManager = new VersionManager(this.root);
  }

  public async execute(
    userConfig: Record<string, unknown>,
    mergeFn: (
      config: RsbuildConfig,
      ...sources: RsbuildConfig[]
    ) => RsbuildConfig,
  ): Promise<RsbuildConfig> {
    const staticExports: string[] = [];
    const hookDefinitions: HookDefinition[] = [];
    let finalRsbuildConfig: RsbuildConfig = {};

    for (const feature of this.features) {
      // 显式断言配置项类型，确保类型安全
      const featureConfig = (userConfig[feature.key] ?? {}) as unknown;

      const result = await feature.apply({
        root: this.root,
        config: featureConfig,
        getV: (pkg: string) => this.versionManager.getV(pkg),
      });

      this.arbiter.addResult(feature.id, result);

      if (result.defines) {
        hookDefinitions.push(...result.defines);
      }
      if (result.staticExports) {
        staticExports.push(result.staticExports);
      }

      if (result.config) {
        finalRsbuildConfig = mergeFn(finalRsbuildConfig, result.config);
      }
    }

    this.arbiter.validate(hookDefinitions);
    const resolvedMap = this.arbiter.resolve();

    resolvedMap.forEach((hooks) => {
      for (const hook of hooks) {
        if (hook.content) {
          Materializer.writeIfChanged(hook.file, hook.content);
        }
      }
    });

    const runnersContent = Generator.generateRunners(
      resolvedMap,
      hookDefinitions,
      this.tempDir,
    );
    const indexContent = Generator.generateIndex(staticExports);

    Materializer.writeIfChanged(
      path.join(this.tempDir, 'runners.ts'),
      runnersContent,
    );
    Materializer.writeIfChanged(
      path.join(this.tempDir, 'index.ts'),
      indexContent,
    );

    return finalRsbuildConfig;
  }

  public getRuntimeAlias(): Record<string, string> {
    return {
      '@@': this.tempDir,
      umi: path.join(this.tempDir, 'index.ts'),
    };
  }
}
