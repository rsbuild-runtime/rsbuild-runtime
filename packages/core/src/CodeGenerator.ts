/**
 * CodeGenerator
 * A utility to manage declarative code generation with automatic:
 * - Import deduplication
 * - POSIX path normalization
 * - Indentation cleanup
 * - Smart object stringification
 */
export class CodeGenerator {
  private imports = new Set<string>();
  private fragments: string[] = [];

  /**
   * Add an import statement to the top of the file.
   * Duplicate statements will be automatically filtered.
   */
  public addImport(statement: string): void {
    const trimmed = statement.trim();
    if (trimmed) {
      this.imports.add(trimmed.endsWith(';') ? trimmed : `${trimmed};`);
    }
  }

  /**
   * Tagged Template Literal handler.
   * Usage: gen.template`const a = ${value};`
   */
  public template(strings: TemplateStringsArray, ...values: unknown[]): void {
    // 1. Join strings and values with safe narrowing
    let raw = strings.reduce((acc, str, i) => {
      const value = values[i];
      let stringifiedValue = '';

      if (value !== undefined && value !== null) {
        // Using switch (typeof) is the most effective way to satisfy ESLint
        // as it provides perfect Type Narrowing for each branch.
        switch (typeof value) {
          case 'object':
            try {
              stringifiedValue = JSON.stringify(value, null, 2);
            } catch {
              stringifiedValue = '/* [Complex Object] */';
            }
            break;
          case 'string':
            stringifiedValue = value;
            break;
          case 'number':
          case 'boolean':
          case 'bigint':
          case 'symbol':
            // In these branches, value is narrowed to a primitive type.
            // Calling .toString() is compliant and safe here.
            stringifiedValue = value.toString();
            break;
          case 'function':
            stringifiedValue = '/* [Function] */';
            break;
          default:
            stringifiedValue = '';
        }
      }

      return acc + str + stringifiedValue;
    }, '');

    // 2. Normalize Windows paths to POSIX
    raw = raw.replace(/\\/g, '/');

    // 3. Simple Indentation Cleanup:
    // Removes the common leading indentation from multi-line template literals.
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

    this.fragments.push(raw.trim());
  }

  /**
   * Collects all fragments and imports into a single string.
   */
  public getContent(): string {
    const sortedImports = Array.from(this.imports).sort();
    const importBlock =
      sortedImports.length > 0 ? sortedImports.join('\n') + '\n\n' : '';

    return `${importBlock}${this.fragments.join('\n\n')}`.trim() + '\n';
  }
}
