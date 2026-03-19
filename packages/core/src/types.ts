import type { RsbuildConfig } from '@rsbuild/core';

export type HookType = 'modify' | 'event';

export interface HookDefinition {
  key: string;
  type: HookType;
  description?: string;
}

export interface HookImplementation {
  file: string;
  content?: string;
  stage?: number;
  exportName?: string;
}

export interface HookOverride {
  mode: 'replace' | 'before' | 'after';
  target: string;
}

export interface FeatureResult {
  config?: RsbuildConfig;
  staticExports?: string;
  defines?: HookDefinition[];
  implements?: Record<string, HookImplementation>;
  stage?: number;
  disableFeatures?: string[];
  overrides?: Record<string, HookOverride>;
}

export interface FeatureParams<V = unknown> {
  root: string;
  config: V;
  getV: (packageName: string) => number;
}
