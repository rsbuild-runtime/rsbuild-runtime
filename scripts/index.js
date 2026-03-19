#!/usr/bin/env node
const { execute: runExecute } = require('./run');
const { execute: debugExecute } = require('./debug');
const { execute: updatePmExecute } = require('./update-pm');

function parseArgs(args) {
  // 简单处理：将所有参数组合成一个命令字符串
  return {
    _: args,
    command: args.join(' '),
  };
}

function init() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = parseArgs(args.slice(1));

  switch (command) {
    case 'run':
      runExecute(commandArgs);
      break;
    case 'debug':
      debugExecute(commandArgs);
      break;
    case 'update:pm':
    case 'update-pm':
      updatePmExecute(commandArgs);
      break;
    default:
      showHelp();
  }
}

function showHelp() {
  console.log(`
🚀 CLI Help
用法: scripts <command> [options]
命令:
  run                兼容旧版 node 运行命令
  debug              以调试模式运行 (端口 9230)
  update:pm          更新 pnpm 版本
  `);
}

// ✨ 必须添加这一行，否则程序运行后会直接退出而不执行任何逻辑
init();
