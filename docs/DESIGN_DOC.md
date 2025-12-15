# MemMe - 碎片化记忆管理系统设计文档

## 1. 项目概述

### 1.1 项目名称
**MemMe** - 个人碎片化记忆管理与回顾系统

### 1.2 项目目标
构建一个支持多用户的Web应用，帮助用户记录、整理和回顾碎片化的记忆片段，通过AI辅助生成标题、标签和摘要，并提供周期性的记忆压缩与回顾功能。

### 1.3 核心价值
- **降低记录门槛**：支持文本、语音、图片多种输入方式
- **智能整理**：AI自动生成标题和标签，减少用户整理负担
- **防止信息爆炸**：周期性压缩历史记忆，保持系统轻量
- **便捷回顾**：支持多维度检索和顺序浏览

---

## 2. 系统架构

### 2.1 技术栈选型

| 层级 | 技术选择 | 理由 |
|------|----------|------|
| 前端 | React + TypeScript + Tailwind CSS | 组件化开发，类型安全，快速样式开发 |
| 后端 | Node.js + Express + TypeScript | 与前端统一语言，异步处理能力强 |
| 数据库 | SQLite (开发) / PostgreSQL (生产) | 轻量级起步，易于迁移 |
| ORM | Prisma | 类型安全，迁移管理便捷 |
| 认证 | JWT + bcrypt | 无状态认证，安全密码存储 |
| AI服务 | OpenAI API / Azure OpenAI | 成熟的大模型API |
| 语音识别 | Web Speech API / Whisper API | 浏览器原生 + 服务端备选 |
| 文件存储 | 本地文件系统 (可扩展至云存储) | 简单起步 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端 (Browser)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  记忆录入   │  │  记忆浏览   │  │   用户管理/设置     │  │
│  │  - 文本     │  │  - 时间线   │  │   - 登录/注册       │  │
│  │  - 语音     │  │  - 搜索     │  │   - 个人设置        │  │
│  │  - 图片     │  │  - 标签     │  │   - 管理员面板      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Auth API │ │Memory API│ │ File API │ │ Compression API│  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │   SQLite    │    │ File Storage│    │  AI Service │
   │  (Prisma)   │    │   (Local)   │    │  (OpenAI)   │
   └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 3. 数据模型设计

### 3.1 ER图

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Memory      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │
│ email           │   │   │ userId (FK)     │◄──┐
│ username        │   └──►│ title           │   │
│ passwordHash    │       │ content         │   │
│ role            │       │ type            │   │
│ avatar          │       │ sourceType      │   │
│ settings (JSON) │       │ attachments     │   │
│ createdAt       │       │ aiSummary       │   │
│ updatedAt       │       │ createdAt       │   │
└─────────────────┘       │ updatedAt       │   │
                          │ isCompressed    │   │
                          │ parentId (FK)   │───┘
                          └─────────────────┘
                                  │
                                  │ M:N
                                  ▼
┌─────────────────┐       ┌─────────────────┐
│      Tag        │◄─────►│   MemoryTag     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ memoryId (FK)   │
│ name            │       │ tagId (FK)      │
│ userId (FK)     │       └─────────────────┘
│ color           │
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│ CompressionLog  │
├─────────────────┤
│ id (PK)         │
│ userId (FK)     │
│ period          │
│ startDate       │
│ endDate         │
│ originalCount   │
│ compressedCount │
│ summaryMemoryId │
│ createdAt       │
└─────────────────┘
```

### 3.2 数据模型详细定义

```prisma
// schema.prisma

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String
  passwordHash String
  role         Role     @default(USER)
  avatar       String?
  settings     Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  memories     Memory[]
  tags         Tag[]
  compressionLogs CompressionLog[]
}

enum Role {
  USER
  ADMIN
}

model Memory {
  id           String   @id @default(uuid())
  userId       String
  title        String
  content      String
  type         MemoryType @default(NOTE)
  sourceType   SourceType @default(TEXT)
  attachments  Json     @default("[]")  // [{filename, path, mimeType, size}]
  aiSummary    String?
  isCompressed Boolean  @default(false)
  parentId     String?  // 压缩后指向的父记忆
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user         User     @relation(fields: [userId], references: [id])
  parent       Memory?  @relation("MemoryHierarchy", fields: [parentId], references: [id])
  children     Memory[] @relation("MemoryHierarchy")
  tags         MemoryTag[]
}

enum MemoryType {
  NOTE        // 普通笔记
  SUMMARY     // 压缩摘要
  MILESTONE   // 里程碑
}

enum SourceType {
  TEXT        // 文本输入
  VOICE       // 语音输入
  IMAGE       // 图片识别
  FILE        // 文件上传
}

model Tag {
  id        String   @id @default(uuid())
  name      String
  color     String   @default("#3B82F6")
  userId    String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  memories  MemoryTag[]
  
  @@unique([name, userId])
}

model MemoryTag {
  memoryId String
  tagId    String
  
  memory   Memory @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([memoryId, tagId])
}

model CompressionLog {
  id              String   @id @default(uuid())
  userId          String
  period          Period
  startDate       DateTime
  endDate         DateTime
  originalCount   Int
  compressedCount Int
  summaryMemoryId String?
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id])
}

enum Period {
  DAY
  WEEK
  MONTH
  YEAR
}
```

---

## 4. API设计

### 4.1 认证模块 `/api/auth`

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /register | 用户注册 | 公开 |
| POST | /login | 用户登录 | 公开 |
| POST | /logout | 用户登出 | 登录用户 |
| GET | /me | 获取当前用户信息 | 登录用户 |
| PUT | /me | 更新当前用户信息 | 登录用户 |
| PUT | /me/password | 修改密码 | 登录用户 |

### 4.2 记忆模块 `/api/memories`

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | / | 获取记忆列表（分页、筛选） | 登录用户 |
| POST | / | 创建新记忆 | 登录用户 |
| GET | /:id | 获取单条记忆详情 | 所有者 |
| PUT | /:id | 更新记忆 | 所有者 |
| DELETE | /:id | 删除记忆 | 所有者 |
| POST | /voice | 语音转文字并创建记忆 | 登录用户 |
| POST | /image | 图片识别并创建记忆 | 登录用户 |
| POST | /:id/generate-meta | AI生成标题和标签 | 所有者 |

### 4.3 标签模块 `/api/tags`

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | / | 获取用户所有标签 | 登录用户 |
| POST | / | 创建新标签 | 登录用户 |
| PUT | /:id | 更新标签 | 所有者 |
| DELETE | /:id | 删除标签 | 所有者 |

### 4.4 压缩模块 `/api/compression`

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /logs | 获取压缩历史 | 登录用户 |
| POST | /compress | 执行记忆压缩 | 登录用户 |
| GET | /preview | 预览待压缩的记忆 | 登录用户 |
| GET | /review/:period | 获取周期回顾 | 登录用户 |

### 4.5 文件模块 `/api/files`

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /upload | 上传文件 | 登录用户 |
| GET | /:id | 获取文件 | 所有者 |
| DELETE | /:id | 删除文件 | 所有者 |

### 4.6 管理员模块 `/api/admin`

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /users | 获取所有用户 | 管理员 |
| PUT | /users/:id | 更新用户信息 | 管理员 |
| DELETE | /users/:id | 删除用户 | 管理员 |
| GET | /stats | 获取系统统计 | 管理员 |

---

## 5. 核心功能设计

### 5.1 记忆录入流程

```
┌─────────────────────────────────────────────────────────────┐
│                      用户输入                                │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                  │
│  │  文本   │    │  语音   │    │  图片   │                  │
│  └────┬────┘    └────┬────┘    └────┬────┘                  │
│       │              │              │                        │
│       │              ▼              ▼                        │
│       │       ┌───────────┐  ┌───────────┐                  │
│       │       │ 语音识别  │  │ 图像识别  │                  │
│       │       │(Web Speech│  │ (GPT-4V)  │                  │
│       │       │/ Whisper) │  │           │                  │
│       │       └─────┬─────┘  └─────┬─────┘                  │
│       │             │              │                        │
│       └─────────────┼──────────────┘                        │
│                     ▼                                        │
│              ┌─────────────┐                                 │
│              │  文本内容   │                                 │
│              └──────┬──────┘                                 │
│                     ▼                                        │
│              ┌─────────────┐                                 │
│              │ AI处理      │                                 │
│              │ - 生成标题  │                                 │
│              │ - 提取标签  │                                 │
│              │ - 生成摘要  │                                 │
│              └──────┬──────┘                                 │
│                     ▼                                        │
│              ┌─────────────┐                                 │
│              │ 用户确认    │                                 │
│              │ /修改/保存  │                                 │
│              └──────┬──────┘                                 │
│                     ▼                                        │
│              ┌─────────────┐                                 │
│              │  存储记忆   │                                 │
│              └─────────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 记忆压缩算法

#### 5.2.1 压缩策略

| 周期 | 触发条件 | 压缩规则 | 保留策略 |
|------|----------|----------|----------|
| Day | 每日凌晨2点 | 合并前一天的碎片记忆 | 保留带附件的、标记重要的 |
| Week | 每周一凌晨3点 | 合并前一周的日摘要 | 保留高互动的、里程碑 |
| Month | 每月1日凌晨4点 | 合并前一月的周摘要 | 保留关键事件 |
| Year | 每年1月1日 | 合并前一年的月摘要 | 生成年度回顾 |

#### 5.2.2 压缩流程

```
原始记忆 (N条)
     │
     ▼
┌─────────────┐
│ 按时间分组  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ AI 摘要生成                          │
│ - 提取关键信息                       │
│ - 识别主题和情感                     │
│ - 生成结构化摘要                     │
│ - 保留重要细节引用                   │
└──────────────────┬──────────────────┘
                   │
                   ▼
            ┌─────────────┐
            │ 摘要记忆    │
            │ (1条)       │
            │ type=SUMMARY│
            └──────┬──────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ 原始记忆标记 isCompressed    │
    │ 设置 parentId 指向摘要       │
    └──────────────────────────────┘
```

### 5.3 搜索与检索

支持多维度检索：
- **全文搜索**：标题、内容、摘要
- **标签过滤**：单标签或组合标签
- **时间范围**：日期选择器
- **类型过滤**：NOTE/SUMMARY/MILESTONE
- **来源过滤**：TEXT/VOICE/IMAGE/FILE

### 5.4 周期回顾功能

```
┌─────────────────────────────────────────────────┐
│              周期回顾视图                        │
├─────────────────────────────────────────────────┤
│  [日] [周] [月] [年]     <- 2024年12月 ->       │
├─────────────────────────────────────────────────┤
│                                                 │
│  📅 本月概览                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 记录数: 45  压缩后: 8  标签: 12个       │   │
│  │ 主要主题: 工作, 学习, 生活              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📝 月度摘要                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 这个月主要完成了...                      │   │
│  │ 关键事件包括...                          │   │
│  │ 学到了...                                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🏷️ 热门标签                                   │
│  [工作 x15] [学习 x12] [想法 x8] [TODO x6]     │
│                                                 │
│  📊 记录趋势图                                  │
│  ▁▂▃▅▇█▆▄▃▂▁▃▅▆▇█▅▃▂▁▂▃▄▅▆▇▅▃▂              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 6. 前端页面设计

### 6.1 页面路由

```
/                    - 首页（重定向到记忆列表或登录）
/login               - 登录页
/register            - 注册页
/memories            - 记忆列表（主页面）
/memories/new        - 新建记忆
/memories/:id        - 记忆详情/编辑
/review              - 周期回顾
/review/:period      - 特定周期回顾
/tags                - 标签管理
/settings            - 个人设置
/admin               - 管理员面板（仅管理员）
/admin/users         - 用户管理
```

### 6.2 核心组件

```
src/components/
├── layout/
│   ├── Header.tsx          # 顶部导航
│   ├── Sidebar.tsx         # 侧边栏
│   └── Layout.tsx          # 整体布局
├── memory/
│   ├── MemoryCard.tsx      # 记忆卡片
│   ├── MemoryList.tsx      # 记忆列表
│   ├── MemoryEditor.tsx    # 记忆编辑器
│   ├── VoiceRecorder.tsx   # 语音录入
│   ├── ImageUploader.tsx   # 图片上传
│   └── TagSelector.tsx     # 标签选择
├── review/
│   ├── PeriodSelector.tsx  # 周期选择
│   ├── ReviewSummary.tsx   # 回顾摘要
│   └── TrendChart.tsx      # 趋势图表
├── common/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Dropdown.tsx
│   └── Loading.tsx
└── admin/
    ├── UserTable.tsx       # 用户表格
    └── StatsPanel.tsx      # 统计面板
```

### 6.3 UI 设计规范

- **配色方案**：采用温暖的米白色 + 蓝灰色为主色调，营造舒适的记录氛围
- **字体**：中文使用思源黑体，英文使用 Inter
- **间距**：基于 4px 网格系统
- **圆角**：卡片 12px，按钮 8px，输入框 6px
- **阴影**：使用柔和的阴影增加层次感

---

## 7. 安全设计

### 7.1 认证安全
- JWT Token 有效期：访问令牌 15分钟，刷新令牌 7天
- 密码要求：最少8位，包含大小写字母和数字
- 密码存储：bcrypt 哈希，cost factor = 12
- 登录限制：5次失败后锁定15分钟

### 7.2 数据安全
- 所有 API 请求验证用户身份
- 记忆数据仅所有者可访问
- 文件上传限制：单文件最大 10MB，支持格式白名单
- 输入验证：防止 XSS 和 SQL 注入

### 7.3 管理员权限
- 管理员可查看用户列表（不包含密码）
- 管理员可禁用/删除用户
- 管理员操作记录审计日志

---

## 8. 部署方案

### 8.1 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma migrate dev

# 启动开发服务器
npm run dev
# 服务运行在 http://localhost:13001
```

### 8.2 目录结构

```
memme/
├── docs/                    # 文档
│   └── DESIGN_DOC.md
├── src/
│   ├── client/             # 前端代码
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── styles/
│   │   └── App.tsx
│   └── server/             # 后端代码
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middlewares/
│       ├── utils/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── uploads/                 # 上传文件存储
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env
```

---

## 9. 确定方案

### 9.1 技术选型
1. **AI服务**：可配置多种LLM服务，优先使用 LMStudio 本地模型，同时兼容 Gemini、OpenAI 等
2. **语音识别**：优先使用浏览器原生 Web Speech API

### 9.2 功能确认
3. **记忆压缩**：压缩后保留原始记忆，支持批量删除
4. **移动端**：需要移动端适配（响应式设计 + PWA）
5. **数据导出**：支持数据导出和恢复功能（JSON/Markdown格式）
6. **分享功能**：支持记忆分享给他人查看

### 9.3 运营配置
7. **用户配额**：默认 1GB 存储空间，管理员可为每个用户单独配置
8. **首个管理员**：通过环境变量配置，首次启动自动创建

---

## 10. 开发计划

### Phase 1: 基础框架 (预计 2 天)
- [x] 项目初始化
- [ ] 数据库模型实现
- [ ] 用户认证系统
- [ ] 基础 API 框架

### Phase 2: 核心功能 (预计 3 天)
- [ ] 记忆 CRUD
- [ ] 文本录入
- [ ] 标签系统
- [ ] 基础前端页面

### Phase 3: AI 集成 (预计 2 天)
- [ ] AI 标题/标签生成
- [ ] 图片识别
- [ ] 语音输入

### Phase 4: 高级功能 (预计 2 天)
- [ ] 记忆压缩
- [ ] 周期回顾
- [ ] 搜索检索

### Phase 5: 完善 (预计 1 天)
- [ ] 管理员功能
- [ ] UI 美化
- [ ] 测试与修复

---

## 附录

### A. 环境变量配置

```env
# 服务器配置
PORT=13001
NODE_ENV=development

# 数据库
DATABASE_URL="file:./dev.db"

# JWT密钥
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key

# AI服务
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 管理员（首次启动创建）
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456
```

### B. API 响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}

// 分页响应
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

*文档版本: 1.0*
*最后更新: 2024年12月15日*
