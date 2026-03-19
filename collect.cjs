const fs = require('fs');
const path = require('path');

const ignoreDirs = ['node_modules', 'dist', '.git', '.runtime'];
const includeExts = ['.ts', '.tsx', '.js', '.mjs', '.json', '.yaml'];

function collect(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (ignoreDirs.some((id) => fullPath.includes(id))) continue;

    if (fs.statSync(fullPath).isDirectory()) {
      collect(fullPath);
    } else if (includeExts.includes(path.extname(fullPath))) {
      console.log(`\n--- PATH: ${fullPath} ---`);
      console.log(fs.readFileSync(fullPath, 'utf-8'));
    }
  }
}

collect('.');
