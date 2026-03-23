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

export interface RuntimeIntent {
  config?: RsbuildConfig;
  defines?: HookDefinition[];
  implements?: Record<string, HookImplementation>;
  stage?: number;
  disableFeatures?: string[];
  overrides?: Record<string, HookOverride>;
  staticExports?: string;
}

export interface FeatureResult extends RuntimeIntent {
  id: string;
}

export interface FeatureParams<V = unknown> {
  root: string;
  config: V;
  namespace: string;
  getV: (packageName: string) => number;
  hasFeature: (id: string) => boolean;
}
