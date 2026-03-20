import type { Feature } from '@rsbuild-runtime/core';

/**
 * Advanced Type Inference:
 * Maps an array of Feature instances to a consolidated config object.
 * e.g., [Feature<'routes', IRoute[]>, Feature<'antd', AntdConfig>]
 * results in { routes?: IRoute[]; antd?: AntdConfig; }
 */
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
  /**
   * List of runtime feature instances.
   */
  features: T;
  /**
   * Direct configuration for the features.
   */
  config?: InferConfigFromFeatures<T>;
  /**
   * The directory to store generated files.
   * Defaults to 'node_modules/.runtime'
   */
  tempDir?: string;
}
