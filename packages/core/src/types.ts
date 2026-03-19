import type { RsbuildConfig } from '@rsbuild/core';

export type HookType = 'modify' | 'event';

export interface HookDefinition {
  key: string;
  type: HookType;
  description?: string;
}

export interface HookImplementation {
  file: string; // 物理文件路径
  content?: string; // 动态生成的代码
  stage?: number; // 优先级
  exportName?: string;
}

export interface FeatureResult {
  config?: RsbuildConfig;
  staticExports?: string;
  defines?: HookDefinition[];
  implements?: Record<string, HookImplementation>;
  stage?: number;
  disableFeatures?: string[];
  overrides?: Record<
    string,
    { mode: 'replace' | 'before' | 'after'; target: string }
  >;
}

export interface FeatureParams<V = unknown> {
  root: string;
  config: V;
  getV: (pkg: string) => number;
}
