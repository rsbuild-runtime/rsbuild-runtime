import { CodeGenerator } from './CodeGenerator';

/**
 * AdapterOptions
 * Defines the minimum required context for any feature adapter.
 */
export interface AdapterOptions {
  /** The runtime namespace, e.g., '@@' or '@runtime' */
  namespace: string;
  /** The directory where temporary runtime files are generated */
  tempDir: string;
  /** The project root directory */
  root: string;
}

/**
 * Adapter
 * The abstract base class for all feature-specific adapters.
 *
 * There is no longer a shared `this.gen` instance. Each sub-class method
 * calls `this.createGen()` to get a fresh, independent CodeGenerator,
 * runs its generation logic, and returns the resulting string directly.
 *
 * This means:
 * - No shared mutable state between methods
 * - No section names or magic strings
 * - Return value IS the output — straightforward and type-safe
 */
export abstract class Adapter {
  protected readonly namespace: string;
  protected readonly tempDir: string;
  protected readonly root: string;

  constructor(options: AdapterOptions) {
    this.namespace = options.namespace;
    this.tempDir = options.tempDir;
    this.root = options.root;
  }

  /**
   * Creates a fresh CodeGenerator instance.
   * Call once at the top of each gen* method; use it locally; return getContent().
   *
   * Example:
   *   public genRoutesData(routes: UmiRoute[]): string {
   *     const gen = this.createGen();
   *     gen.addImport("import { lazy } from 'react';");
   *     gen.template`export default ${stringifyRoutes(routes)};`;
   *     return gen.getContent();
   *   }
   */
  protected createGen(): CodeGenerator {
    return new CodeGenerator();
  }

  /**
   * Ensures paths are POSIX-compliant for use in generated code.
   */
  protected formatPath(p: string): string {
    return p.replace(/\\/g, '/');
  }

  /**
   * Abstract method to be implemented by sub-classes.
   */
  public abstract execute(...args: unknown[]): void;
}
