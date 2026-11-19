# AGENTS.md

## 构建与部署

- 不要在本地运行 `pnpm build`、`npm run build`、`vite build` 或任何会生成 `docs/`、`dist/` 的构建命令。
- 线上页面由 GitHub Actions（`.github/workflows/deploy-pages.yml`）在推送到 `master` 后自动构建并部署，本地不需要也不应该产出构建文件。
- 验证改动时只做类型检查：`npx vue-tsc --noEmit -p tsconfig.app.json`，只关注本次改动涉及的文件（依赖包和已有文件的历史报错可忽略）。
- 需要看效果时，提示用户自行运行 `pnpm dev` 预览。

## 数据存储

- 修改本地存储、迁移或备份前，先阅读 [STORAGE.md](STORAGE.md)。新增字段或调整结构时同步更新文档。
