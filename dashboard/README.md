# 个人维护的 AstrBot 管理面板

当前状态：
- 已完成 Dashboard 全量 TypeScript 化（不再依赖/引用本地 JS 源码）
- 构建目标已对齐到 ES2022，使用了 `"strict": true,` 模式
- 本仓库内 `pnpm build` 与 `pnpm typecheck` 均可通过

## 开发

在 `dashboard/` 目录下：

```bash
pnpm install
pnpm dev
```

## 类型检查 & 构建

```bash
pnpm typecheck
pnpm build
```

## 规划

后续计划：迁移至 Nuxt.js，实现前后端分离（待排期）。

