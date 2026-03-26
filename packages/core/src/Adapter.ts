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
 * Integrates CodeGenerator and provides common utility methods.
 */
export abstract class Adapter {
  protected readonly gen: CodeGenerator;
  protected readonly namespace: string;
  protected readonly tempDir: string;
  protected readonly root: string;

  constructor(options: AdapterOptions) {
    this.gen = new CodeGenerator();
    this.namespace = options.namespace;
    this.tempDir = options.tempDir;
    this.root = options.root;
  }

  /**
   * Retrieves the finalized code content from the generator.
   */
  public getOutput(): string {
    return this.gen.getContent();
  }

  /**
   * Ensures paths are POSIX-compliant for use in generated code.
   * Useful for converting absolute system paths into valid import strings.
   */
  protected formatPath(p: string): string {
    return p.replace(/\\/g, '/');
  }

  /**
   * Abstract method to be implemented by sub-classes to define
   * their specific code generation logic.
   */
  public abstract execute(...args: unknown[]): void;
}
