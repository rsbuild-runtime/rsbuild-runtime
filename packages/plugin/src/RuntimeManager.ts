import path from 'node:path';
import {
  Arbiter,
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
  private arbiter = new Arbiter();
  private versionManager: VersionManager;
  private tempDir: string;
  private root: string;

  constructor(
    private api: RsbuildPluginAPI,
    private features: Feature<any, any>[],
    tempDir?: string,
  ) {
    this.root = api.context.rootPath;
    this.tempDir = tempDir || path.join(this.root, 'node_modules/.runtime');
    this.versionManager = new VersionManager(this.root);
  }

  public async execute(
    userConfig: Record<string, any>,
  ): Promise<RsbuildConfig> {
    const staticExports: string[] = [];
    const hookDefinitions: HookDefinition[] = [];
    let mergedRsbuildConfig: RsbuildConfig = {};

    // 1. Collect Intents
    for (const feature of this.features) {
      const result = await feature.apply({
        root: this.root,
        config: userConfig[feature.key],
        getV: (pkg) => this.versionManager.getV(pkg),
      });

      const fullResult: FeatureResult = { ...result, id: feature.id };
      this.arbiter.addResult(feature.id, fullResult);

      // Aggregate metadata
      if (result.defines) hookDefinitions.push(...result.defines);
      if (result.staticExports) staticExports.push(result.staticExports);
      if (result.config) {
        // Deep merge of rsbuild config fragments can be handled by Rsbuild's utility later
        mergedRsbuildConfig = result.config;
      }
    }

    // 2. Resolve & Validate
    this.arbiter.validate(hookDefinitions);
    const resolvedMap = this.arbiter.resolve();

    // 3. Materialize Implementation Files
    resolvedMap.forEach((hooks) => {
      for (const hook of hooks) {
        if (hook.content) {
          Materializer.writeIfChanged(hook.file, hook.content);
        }
      }
    });

    // 4. Generate Core Runners and Entry
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

    return mergedRsbuildConfig;
  }

  public getRuntimeAlias(): Record<string, string> {
    return {
      '@@': this.tempDir,
      umi: path.join(this.tempDir, 'index.ts'),
    };
  }
}
