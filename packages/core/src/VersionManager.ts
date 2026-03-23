import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export class VersionManager {
  private cache = new Map<string, number>();
  private userRequire: NodeJS.Require;

  constructor(rootPath: string) {
    this.userRequire = createRequire(join(rootPath, 'index.js'));
  }

  public getV(packageName: string): number {
    if (this.cache.has(packageName)) return this.cache.get(packageName)!;

    let version = 0;
    try {
      const pkgPath = this.userRequire.resolve(`${packageName}/package.json`);
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        version: string;
      };
      version = parseInt(pkg.version.split('.')[0], 10) || 0;
    } catch {
      version = 0;
    }

    this.cache.set(packageName, version);
    return version;
  }
}
