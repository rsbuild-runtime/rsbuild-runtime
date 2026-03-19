const fs = require('fs');
const path = require('path');

const ignoreDirs = ['node_modules', 'dist', '.git', '.runtime'];
const includeExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.yaml'];

/**
 * Recursively collect file contents from a specific directory.
 * @param {string} dir
 */
function collect(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Error: Directory "${dir}" does not exist.`);
    return;
  }

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);

    // Skip ignored directories
    if (ignoreDirs.some((id) => fullPath.includes(id))) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collect(fullPath);
    } else if (includeExts.includes(path.extname(fullPath))) {
      console.log(`\n--- PATH: ${fullPath} ---`);
      console.log(fs.readFileSync(fullPath, 'utf-8'));
    }
  }
}

// Get the target directory from command line arguments
const target = process.argv[2] || '.';
collect(target);
