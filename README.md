# MemMe 碎片化记忆管理系统

本项目是一个支持多模态输入、AI 辅助整理、周期压缩回顾的多用户记忆管理 Web 应用。默认后端运行在 `13001` 端口，前端开发端口为 `5173`。

## 功能特性
- 文本/语音/图片录入，空标题或标签时自动调用大模型生成
- 图片上传后可走视觉模型摘要（已预留接口）
- 记忆 CRUD，标签管理，顺序浏览与搜索（关键词、标签、时间范围、类型）
- 周期压缩与回顾（按日/周/月/年），保留原始记忆并可批量删除
- 数据导出/恢复（导出 JSON 备份），记忆分享链接（含过期与浏览计数）
- 多账号、JWT 认证、管理员配额管理（默认 1GB，可配置）
- LLM 可配置：优先 LMStudio，本地可切换 Gemini / OpenAI 兼容
- 移动端自适应（Tailwind 响应式）

## 目录结构
```
memme/
├─ docs/               # 设计文档等
├─ prisma/             # Prisma schema 与迁移
├─ src/
│  ├─ client/          # 前端 React + Vite + Tailwind
│  └─ server/          # 后端 Express + Prisma
├─ uploads/            # 上传文件目录（运行时生成）
├─ .env.example        # 环境变量示例
└─ package.json
```

## 快速开始（开发）
```bash
npm install
copy .env.example .env
npx prisma migrate dev --name init
npm run dev
```
- 前端（开发）：http://localhost:5173
- 后端 API：http://localhost:13001

## 生产构建与启动
```bash
npm run build
npm start
```
- 静态文件与 API 都在 http://localhost:13001 提供

## 环境变量关键项（.env）
- `PORT`: 默认 13001
- `DATABASE_URL`: SQLite 路径，默认 `file:./dev.db`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- LLM 选择：`LLM_PROVIDER`=`lmstudio|openai|gemini`
  - LMStudio: `LMSTUDIO_BASE_URL`, `LMSTUDIO_MODEL`
  - OpenAI: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`
  - Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`
- 上传/配额：`UPLOAD_DIR`, `MAX_FILE_SIZE`, `DEFAULT_STORAGE_QUOTA`
- 管理员初始化：`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`

## 常用脚本
- `npm run dev`：并行启动前后端（dev）
- `npm run dev:server` / `npm run dev:client`
- `npm run build`：前后端打包
- `npm run start`：生产后端 + 静态资源
- `npm run db:migrate`：Prisma 迁移（开发）
- `npm run db:studio`：Prisma Studio

## 已知事项
- LMStudio/Gemini/OpenAI 视觉与文本均按 OpenAI 兼容接口封装（Gemini 走专用路径）。需提供对应的 baseUrl/apiKey/model。
- 浏览器语音识别依赖 Web Speech API（推荐 Chrome）。
- `uploads/` 默认忽略在 git 中，生产请挂载持久化存储。

## 许可证
MIT
