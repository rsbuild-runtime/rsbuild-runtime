import type { RsbuildConfig } from '@rsbuild/core';

export type HookType = 'modify' | 'event';

export interface HookDefinition {
  key: string;
  type: HookType;
  description?: string;
}

export interface HookImplementation {
  content?: string;
  file?: string;
  stage?: number;
  exportName?: string;
}

export interface HookOverride {
  mode: 'replace' | 'before' | 'after';
  target: string;
}

export interface OutputFile {
  path: string;
  content: string;
}

export interface RuntimeIntent {
  config?: RsbuildConfig;
  files?: OutputFile[];
  defines?: HookDefinition[];
  implements?: Record<string, HookImplementation>;
  stage?: number;
  disableFeatures?: string[];
  overrides?: Record<string, HookOverride>;
  staticExports?: string;
  /**
   * Declarative runtime dependencies required by this feature.
   * Format: { "package-name": "semver-range" }
   */
  runtimeDeps?: Record<string, string>;
}

export interface FeatureResult extends RuntimeIntent {
  id: string;
}

export interface FeatureParams<V = unknown, VV = Record<string, unknown>> {
  root: string;
  config: V;
  allConfig: VV;
  namespace: string;
  tempDir: string;
  getV: (packageName: string) => number;
  hasFeature: (id: string) => boolean;
  /**
   * Extracts specific version ranges from a given package.json file.
   * Useful for syncing runtime requirements with the feature's own package.json.
   */
  getRequirements: (
    depNames: string[],
    packageJsonPath: string,
  ) => Record<string, string>;
}
