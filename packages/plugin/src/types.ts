import type { Feature } from '@rsbuild-runtime/core';

export interface PluginOptions {
  /**
   * List of runtime feature instances.
   */
  features?: Feature<any, any>[];
  /**
   * The directory to store generated files.
   * Defaults to 'node_modules/.runtime'
   */
  tempDir?: string;
}
