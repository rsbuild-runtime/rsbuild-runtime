import type { Feature } from '@rsbuild-runtime/core';

export type InferConfigFromFeatures<
  T extends readonly Feature<string, unknown>[],
> = {
  [P in T[number] as P['key']]?: P extends Feature<string, infer V> ? V : never;
};

export interface PluginOptions<
  T extends readonly Feature<string, unknown>[] = readonly Feature<
    string,
    unknown
  >[],
> {
  features: T;
  config?: InferConfigFromFeatures<T>;
  namespace?: string;
  tempDir?: string;
}
