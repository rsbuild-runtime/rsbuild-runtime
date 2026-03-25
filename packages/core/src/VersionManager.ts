import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export class VersionManager {
  private readonly cache = new Map<string, string>();
  private readonly userRequire: NodeJS.Require;
  private readonly hostPackageJson: Record<string, unknown>;

  constructor(private readonly rootPath: string) {
    this.userRequire = createRequire(join(rootPath, 'index.js'));

    const pkgPath = join(rootPath, 'package.json');
    let pkgData: Record<string, unknown> = {};

    if (existsSync(pkgPath)) {
      try {
        // Fix: Cast JSON.parse result to avoid unsafe assignment from any
        pkgData = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<
          string,
          unknown
        >;
      } catch {
        pkgData = {};
      }
    }
    this.hostPackageJson = pkgData;
  }

  /**
   * Checks if a package is explicitly declared in the host project's dependencies.
   */
  private isDeclaredInHost(packageName: string): boolean {
    const pkg = this.hostPackageJson as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return !!(
      pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName]
    );
  }

  /**
   * Resolves and returns the full version string.
   */
  public getFullVersion(packageName: string): string | null {
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName) ?? null;
    }

    if (!this.isDeclaredInHost(packageName)) {
      return null;
    }

    try {
      const pkgPath = this.userRequire.resolve(`${packageName}/package.json`);
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        version: string;
      };
      this.cache.set(packageName, pkg.version);
      return pkg.version;
    } catch {
      return null;
    }
  }

  public getV(packageName: string): number {
    const version = this.getFullVersion(packageName);
    if (!version) return 0;
    return parseInt(version.split('.')[0], 10) || 0;
  }

  /**
   * Extracts version ranges with correct priority: peerDependencies takes precedence.
   */
  public getRequirements(
    depNames: string[],
    packageJsonPath: string,
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!existsSync(packageJsonPath)) {
      return result;
    }

    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };

      const allDeps = {
        ...pkg.devDependencies,
        ...pkg.dependencies,
        ...pkg.peerDependencies,
      };

      for (const name of depNames) {
        const range = allDeps[name];
        if (range) {
          result[name] = range;
        }
      }
    } catch {
      // ignore
    }

    return result;
  }
}
