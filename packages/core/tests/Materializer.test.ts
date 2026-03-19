import { expect, test, describe, beforeEach, afterEach } from '@rstest/core';
import fs from 'node:fs';
import path from 'node:path';
import { Materializer } from '../src/Materializer';

const TEST_TMP_DIR = path.join(__dirname, '.tmp_materializer');

void describe('Materializer', () => {
  void beforeEach(() => {
    if (!fs.existsSync(TEST_TMP_DIR)) {
      fs.mkdirSync(TEST_TMP_DIR, { recursive: true });
    }
  });

  void afterEach(() => {
    if (fs.existsSync(TEST_TMP_DIR)) {
      fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
    }
  });

  void test('should create file and directory on first call', () => {
    const filePath = path.join(TEST_TMP_DIR, 'deep/dir/test.txt');
    const content = 'hello rsbuild';

    Materializer.writeIfChanged(filePath, content);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
  });

  void test('should skip writing if content is identical', async () => {
    const filePath = path.join(TEST_TMP_DIR, 'stable.txt');
    const content = 'constant content';

    Materializer.writeIfChanged(filePath, content);
    const firstMtime = fs.statSync(filePath).mtimeMs;

    await new Promise((resolve) => setTimeout(resolve, 10));

    Materializer.writeIfChanged(filePath, content);
    const secondMtime = fs.statSync(filePath).mtimeMs;

    expect(secondMtime).toBe(firstMtime);
  });

  void test('should overwrite file if content changes', async () => {
    const filePath = path.join(TEST_TMP_DIR, 'update.txt');
    const c1 = 'version 1';
    const c2 = 'version 2';

    Materializer.writeIfChanged(filePath, c1);
    const m1 = fs.statSync(filePath).mtimeMs;

    await new Promise((resolve) => setTimeout(resolve, 10));

    Materializer.writeIfChanged(filePath, c2);
    const m2 = fs.statSync(filePath).mtimeMs;

    expect(fs.readFileSync(filePath, 'utf-8')).toBe(c2);
    expect(m2).toBeGreaterThan(m1);
  });
});
