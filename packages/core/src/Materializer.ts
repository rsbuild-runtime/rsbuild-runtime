import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, normalize } from 'node:path';

export class Materializer {
  public static writeIfChanged(
    filePath: string,
    content: string,
    encoding: BufferEncoding = 'utf-8',
  ): void {
    // Defense: Do not write or delete if content is empty (prevents accidental wipe)
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
      } catch (err) {
        console.warn(`[Materializer] Read failed: ${normalizedPath}`, err);
      }
    }

    try {
      writeFileSync(normalizedPath, content, { encoding });
    } catch (err) {
      throw new Error(
        `[Materializer] Write failed: ${normalizedPath}\n${String(err)}`,
      );
    }
  }

  private static calculateHash(content: string | Buffer): string {
    return createHash('md5').update(content).digest('hex');
  }
}
