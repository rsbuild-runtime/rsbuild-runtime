// run.js
const { execSync } = require('child_process');
const path = require('path');

const packagePath = path.join(process.cwd(), 'package.json');
const packageData = require(packagePath);

// 提取判定 OpenSSL 补丁的逻辑
function getLegacyEnv() {
  const nodeVersion = process.version;
  const versionMatch = nodeVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) return {};

  const major = parseInt(versionMatch[1]);
  const minor = parseInt(versionMatch[2]);

  if (
    major >= 17 ||
    (major === 16 && minor >= 13) ||
    process.platform === 'win32'
  ) {
    return { NODE_OPTIONS: '--openssl-legacy-provider' };
  }
  return {};
}

/**
 * 核心执行函数
 * @param {Object} args 参数
 * @param {Object} extraEnv 额外的环境变量（如调试参数）
 */
function baseExecute(args, extraEnv = {}) {
  let command = args.command;
  if (!command && args._ && args._.length > 0) {
    command = args._.join(' ');
  }

  if (!command) {
    console.log('❌ 缺少命令 command');
    return;
  }

  const stdio = args.silent ? 'pipe' : 'inherit';

  // 合并环境变量：系统环境 + OpenSSL补丁 + 额外注入(如Debug)
  const legacyEnv = getLegacyEnv();
  const finalEnv = { ...process.env, ...legacyEnv };

  if (extraEnv.NODE_OPTIONS) {
    finalEnv.NODE_OPTIONS = [finalEnv.NODE_OPTIONS, extraEnv.NODE_OPTIONS]
      .filter(Boolean)
      .join(' ');
  }

  try {
    execSync(command, {
      stdio,
      env: finalEnv,
      encoding: 'utf8',
    });
  } catch (error) {
    const err = String(error);
    if (
      err.includes('Cannot find module') ||
      err.includes('MODULE_NOT_FOUND')
    ) {
      console.log(
        `🟡 请先运行：pnpm turbo run build --filter="${packageData.name}^..."`,
      );
    } else {
      console.log(`🟡 ${command} 运行失败`);
    }
  }
}

// run.js 的默认导出不带 debug 标志
function execute(args) {
  baseExecute(args);
}

module.exports = { execute, baseExecute };
