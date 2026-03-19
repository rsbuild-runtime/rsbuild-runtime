# rsbuild-runtime

[![NPM Version](https://img.shields.io/npm/v/rsbuild-plugin-runtime.svg)](https://www.npmjs.com/package/rsbuild-plugin-runtime)
[![License](https://img.shields.io/github/license/rsbuild-runtime/rsbuild-runtime.svg)](https://github.com/rsbuild-runtime/rsbuild-runtime/blob/main/LICENSE)

`rsbuild-runtime` 是一个基于 Rsbuild (Rspack) 构建的工业级运行时框架内核引擎。它旨在解决现代 Web 应用在构建时配置与运行时逻辑之间的缝隙，通过**静态编排 (Static Orchestration)** 与 **代码物化 (Materialization)** 技术，为开发者提供透明、高性能且具备强类型约束的框架级能力。

## 🌟 核心愿景

**解构框架魔法，重塑确定性。**

传统的黑盒框架（如 Umi v3）通过大量内置插件实现魔法般的开发体验，但往往伴随着难以调试和升级的隐忧。`rsbuild-runtime` 将这些能力解构为：

- **物理可追踪**：所有生成的代码均物化为物理文件，拒绝隐形的虚拟模块。
- **构建时仲裁**：冲突解决与优先级排序在构建阶段完成，消除运行时开销。
- **环境感知**：按需识别依赖版本，实现跨版本的平滑适配。

## ✨ 特性

- 🛠️ **模块化架构 (Feature-based)**：功能解耦为独立 Feature，配置即特性，类型自驱动。
- ⚖️ **仲裁引擎 (Arbiter)**：内置冲突仲裁算法，支持全局禁用、局部替换与 `stage` 权重排序。
- 📦 **物理物化 (Materialization)**：产出存放于 `node_modules/.runtime`，完美支持 IDE 跳转与 TypeScript 类型补全。
- ⚡ **零运行时损耗**：生成的运行时脚本采用静态导入与洋葱模型同步执行。
- 🔄 **版本平滑演进**：支持特性内部的本地适配器，屏蔽底层依赖（如 React Router 5/6）的版本差异。

## 📂 仓库结构

本项目采用 Monorepo 管理：

```text
packages/
  ├── core/        # 核心引擎：包含仲裁器、物化器与版本扫描器
  ├── plugin/      # Rsbuild 插件实现：接入 Rsbuild 生命周期并调度核心逻辑
  └── features/    # 内置特性模块（如路由适配、入口管理等）
```

## 🚀 快速开始

### 安装

```bash
pnpm add rsbuild-plugin-runtime -D
```

### 使用

在 `rsbuild.config.ts` 中引入插件：

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginRuntime } from 'rsbuild-plugin-runtime';

export default defineConfig({
  plugins: [
    pluginRuntime({
      // 特性配置
      routes: [{ path: '/', component: '@/pages/index' }],
    }),
  ],
});
```

### 配置类型提示 (TypeScript)

为了获得最佳的开发体验，请在 `tsconfig.json` 中配置路径映射：

```json
{
  "compilerOptions": {
    "paths": {
      "@@/*": ["node_modules/.runtime/*"],
      "umi": ["node_modules/.runtime/index.ts"]
    }
  }
}
```

## 🏗️ 架构概览

1. **探测 (Detection)**：通过 `VersionManager` 按需获取项目依赖版本。
2. **收集 (Collection)**：各 `Feature` 产出构建配置与运行时 `content`。
3. **仲裁 (Arbitration)**：`Orchestrator` 根据配置执行三级冲突仲裁（禁用 -> 替换 -> 排序）。
4. **物化 (Materialization)**：经过 Hash 校验后，将有效内容写入磁盘。
5. **生成 (Generation)**：生成静态的 `plugin.ts` 引导文件。

## 🤝 贡献

请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与项目开发。

<!-- ## 📄 开源协议 -->
