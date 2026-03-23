import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, normalize } from 'node:path';

export class Materializer {
  /**
   * Atomic write based on MD5 content hash.
   */
  public static writeIfChanged(filePath: string, content: string): void {
    if (!content) return;

    const normalizedPath = normalize(filePath);
    const dir = dirname(normalizedPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const newHash = this.calculateHash(content);

    if (existsSync(normalizedPath)) {
      try {
        const oldHash = this.calculateHash(readFileSync(normalizedPath));
        if (newHash === oldHash) return;
      } catch {
        // Fallback to write if read fails
      }
    }

    writeFileSync(normalizedPath, content, 'utf-8');
  }

  private static calculateHash(data: string | Buffer): string {
    return createHash('md5').update(data).digest('hex');
  }
}
