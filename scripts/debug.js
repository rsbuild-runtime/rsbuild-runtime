const { baseExecute } = require('./run');

function execute(args) {
  // 调用核心逻辑，并强制注入调试参数
  baseExecute(args, {
    NODE_OPTIONS: '--inspect-brk=9230',
  });
}

module.exports = { execute };
