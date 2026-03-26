import { readFileSync, existsSync } from 'node:fs';
import resolve from 'resolve';
import semver from 'semver';
import pacote from 'pacote';

export interface DependencyAuditResult {
  name: string;
  expected: string;
  actual: string | null;
  isSatisfied: boolean;
  errorType: 'missing' | 'mismatch' | 'none';
  suggestion: string;
}

export type Manifest = Record<string, string>;

export interface AuditOptions {
  manifest: Manifest;
  fetchRemote?: boolean;
}

export interface ResolutionOptions {
  manifest: Manifest;
  hostPackagePath?: string;
  fetchRemote?: boolean;
}

export class VersionManager {
  private readonly cache = new Map<string, string>();

  constructor(private readonly rootPath: string) {}

  /**
   * Resolves a package path relative to the given base directory.
   */
  private resolvePath(id: string, basedir?: string): string {
    return resolve.sync(id, { basedir: basedir ?? this.rootPath });
  }

  /**
   * Detects the package manager used in the environment.
   */
  public getPackageManager(): { name: string; command: string } {
    const ua = process.env.npm_config_user_agent || '';
    if (ua.startsWith('pnpm')) return { name: 'pnpm', command: 'add' };
    if (ua.startsWith('yarn')) return { name: 'yarn', command: 'add' };
    return { name: 'npm', command: 'install' };
  }

  /**
   * Gets the physical version installed in node_modules.
   */
  public getFullVersion(packageName: string, basedir?: string): string | null {
    const cacheKey = `${basedir ?? this.rootPath}:${packageName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    try {
      const pkgPath = this.resolvePath(`${packageName}/package.json`, basedir);
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        version: string;
      };
      this.cache.set(cacheKey, pkg.version);
      return pkg.version;
    } catch {
      return null;
    }
  }

  /**
   * Gets the major version of a package.
   */
  public getV(packageName: string): number {
    const version = this.getFullVersion(packageName);
    if (!version) return 0;
    return semver.major(version);
  }

  /**
   * Checks if installed dependencies satisfy the manifest.
   */
  public checkDependencies(
    options: AuditOptions & { fetchRemote: true },
  ): Promise<DependencyAuditResult[]>;
  public checkDependencies(
    options: AuditOptions & { fetchRemote?: false },
  ): DependencyAuditResult[];
  public checkDependencies(
    options: AuditOptions,
  ): DependencyAuditResult[] | Promise<DependencyAuditResult[]> {
    const { manifest, fetchRemote = false } = options;

    const localAudit = (): DependencyAuditResult[] => {
      return Object.entries(manifest).map(([name, range]) => {
        const actual = this.getFullVersion(name);
        const isSatisfied = !!actual && semver.satisfies(actual, range);
        return {
          name,
          expected: range,
          actual,
          isSatisfied,
          errorType: !actual ? 'missing' : !isSatisfied ? 'mismatch' : 'none',
          suggestion: this.formatRequirement(name, range),
        };
      });
    };

    const results = localAudit();
    if (!fetchRemote) return results;

    return (async () => {
      for (const result of results) {
        if (!result.isSatisfied) {
          const best = await this.getBestMatchFromRegistry(
            result.name,
            result.expected,
          );
          result.suggestion = this.formatRequirement(
            result.name,
            result.expected,
            best,
          );
        }
      }
      return results;
    })();
  }

  /**
   * Returns recommended resolutions for missing or incompatible dependencies.
   */
  public getResolution(
    options: ResolutionOptions & { fetchRemote: true },
  ): Promise<Manifest>;
  public getResolution(
    options: ResolutionOptions & { fetchRemote?: false },
  ): Manifest;
  public getResolution(
    options: ResolutionOptions,
  ): Manifest | Promise<Manifest> {
    const { manifest, hostPackagePath, fetchRemote = false } = options;

    const getDiffEntries = (): [string, string][] => {
      if (!hostPackagePath || !existsSync(hostPackagePath)) {
        return Object.entries(manifest);
      }

      const hostRequirements = this.getRequirements(
        Object.keys(manifest),
        hostPackagePath,
      );
      return Object.entries(manifest).filter(([name, range]) => {
        const hostRange = hostRequirements[name];
        // Suggest if missing in host or if host range is not a subset of required range
        return !hostRange || !semver.subset(hostRange, range);
      });
    };

    const diffEntries = getDiffEntries();

    if (!fetchRemote) {
      return Object.fromEntries(
        diffEntries.map(([name, range]) => [
          name,
          this.formatRequirement(name, range),
        ]),
      );
    }

    return (async () => {
      const resolution: Manifest = {};
      for (const [name, range] of diffEntries) {
        const best = await this.getBestMatchFromRegistry(name, range);
        resolution[name] = this.formatRequirement(name, range, best);
      }
      return resolution;
    })();
  }

  /**
   * Extracts version ranges from a package.json file with a priority scan.
   */
  public getRequirements(
    depNames: string[],
    packageJsonPath: string,
  ): Manifest {
    if (!existsSync(packageJsonPath)) return {};

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content) as {
        dependencies?: Manifest;
        devDependencies?: Manifest;
        peerDependencies?: Manifest;
      };

      const allDeps = {
        ...pkg.devDependencies,
        ...pkg.dependencies,
        ...pkg.peerDependencies,
      };

      const result: Manifest = {};
      for (const name of depNames) {
        if (allDeps[name]) result[name] = allDeps[name];
      }
      return result;
    } catch {
      return {};
    }
  }

  /**
   * Formats a dependency requirement string for installation commands.
   */
  private formatRequirement(
    name: string,
    range: string,
    bestMatch?: string | null,
  ): string {
    const isExact = semver.clean(range) !== null || !/[><=^~*x]/.test(range);
    if (isExact) return `${name}@${range}`;
    if (bestMatch) return `${name}@^${bestMatch}`;
    return `${name}@${range}`;
  }

  /**
   * Fetches the best satisfying version from the remote registry using pacote.
   */
  private async getBestMatchFromRegistry(
    name: string,
    range: string,
  ): Promise<string | null> {
    try {
      const manifest = await pacote.packument(name);
      const versions = Object.keys(manifest.versions);
      return semver.maxSatisfying(versions, range);
    } catch {
      return null;
    }
  }
}
