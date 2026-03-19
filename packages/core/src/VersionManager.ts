import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export class VersionManager {
  private cache = new Map<string, number>();
  private userRequire: NodeJS.Require;

  constructor(rootPath: string) {
    // 严谨定位：以用户项目根目录为起点创建 require 实例
    // 这样可以确保 resolve 到的是用户项目 node_modules 里的包
    this.userRequire = createRequire(join(rootPath, 'index.js'));
  }

  /**
   * 按需获取依赖包的主版本号
   */
  public getV(packageName: string): number {
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName)!;
    }

    let version = 0;
    try {
      // 1. 查找包的 package.json 物理路径
      const pkgPath = this.userRequire.resolve(`${packageName}/package.json`);
      // 2. 读取内容并解析
      const pkgContent = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        version: string;
      };
      // 3. 提取主版本号
      version = parseInt(pkgContent.version.split('.')[0], 10) || 0;
    } catch {
      // 若 resolve 失败，说明依赖未安装
      version = 0;
    }

    this.cache.set(packageName, version);
    return version;
  }
}
