/**
 * CodeGenerator
 * A stateless-per-use utility for code generation.
 * Each instance is meant to be created, used, and discarded within
 * a single generation method — no shared state, no sections needed.
 *
 * Provides automatic:
 * - Import deduplication
 * - POSIX path normalization
 * - Indentation cleanup
 * - Smart value stringification
 */
export class CodeGenerator {
  private imports = new Set<string>();
  private fragments: string[] = [];

  /**
   * Add an import statement to the top of the file.
   * Duplicate statements are automatically filtered.
   */
  public addImport(statement: string): void {
    const trimmed = statement.trim();
    if (!trimmed) return;
    this.imports.add(trimmed.endsWith(';') ? trimmed : `${trimmed};`);
  }

  /**
   * Tagged Template Literal handler.
   * Usage: gen.template`const a = ${value};`
   */
  public template(strings: TemplateStringsArray, ...values: unknown[]): void {
    const raw = strings.reduce(
      (acc, str, i) => acc + str + this.stringify(values[i]),
      '',
    );
    this.fragments.push(this.normalizeAndTrim(raw));
  }

  /**
   * Collects all imports and fragments into a single string.
   */
  public getContent(): string {
    const sortedImports = Array.from(this.imports).sort();
    const importBlock =
      sortedImports.length > 0 ? sortedImports.join('\n') + '\n\n' : '';

    return `${importBlock}${this.fragments.join('\n\n')}`.trim() + '\n';
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private stringify(value: unknown): string {
    if (value === undefined || value === null) return '';

    switch (typeof value) {
      case 'object':
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return '/* [Complex Object] */';
        }
      case 'string':
        return value;
      case 'function':
        return '/* [Function] */';
      case 'number':
      case 'boolean':
      case 'bigint':
      case 'symbol':
        return value.toString();
      default:
        return '';
    }
  }

  private normalizeAndTrim(raw: string): string {
    raw = raw.replace(/\\/g, '/');

    const lines = raw.split('\n');
    if (lines.length > 1) {
      const minIndent = lines
        .slice(1)
        .filter((line) => line.trim().length > 0)
        .reduce((min, line) => {
          const match = line.match(/^(\s*)/);
          return match ? Math.min(min, match[1].length) : min;
        }, Infinity);

      if (minIndent !== Infinity) {
        raw = lines
          .map((line, i) => (i === 0 ? line : line.slice(minIndent)))
          .join('\n');
      }
    }

    return raw.trim();
  }
}
