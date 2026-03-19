import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Materializer {
  /**
   * 只有在内容发生变化时才写入文件，防止触发无效的构建更新
   */
  public static writeIfChanged(filePath: string, content: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const newHash = this.calculateHash(content);

    if (existsSync(filePath)) {
      const oldContent = readFileSync(filePath, 'utf-8');
      const oldHash = this.calculateHash(oldContent);
      if (newHash === oldHash) {
        return; // 内容一致，跳过写入
      }
    }

    writeFileSync(filePath, content, 'utf-8');
  }

  private static calculateHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }
}
