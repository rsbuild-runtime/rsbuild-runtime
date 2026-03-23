import { expect, test, describe, beforeEach, afterEach } from '@rstest/core';
import fs from 'node:fs';
import path from 'node:path';
import { Materializer } from '../src/Materializer';

const TMP_DIR = path.join(__dirname, '.tmp_mat');

void describe('Materializer', () => {
  void beforeEach(() => {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  });

  void afterEach(() => {
    if (fs.existsSync(TMP_DIR))
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  void test('should skip write if content hash matches', async () => {
    const file = path.join(TMP_DIR, 'hash.ts');
    const content = 'export const a = 1;';

    Materializer.writeIfChanged(file, content);
    const firstMtime = fs.statSync(file).mtimeMs;

    await new Promise((resolve) => setTimeout(resolve, 10));

    Materializer.writeIfChanged(file, content);
    const secondMtime = fs.statSync(file).mtimeMs;

    expect(secondMtime).toBe(firstMtime);
  });

  void test('should create directories recursively', () => {
    const file = path.join(TMP_DIR, 'a/b/c/test.ts');
    Materializer.writeIfChanged(file, 'test');
    expect(fs.existsSync(file)).toBe(true);
  });
});
