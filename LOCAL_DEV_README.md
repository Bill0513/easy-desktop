# 本地开发环境说明

## 概述

本项目已实现本地开发和线上部署的环境分离:

- **本地开发**: 使用 Express + SQLite + 本地文件系统
- **线上部署**: 使用 Cloudflare Functions + KV + R2 + D1

所有数据通过 API 持久化,不再使用 localStorage 存储业务数据。

## 架构说明

### 本地开发环境

```
┌─────────────────┐
│  Vue 3 前端     │ (http://localhost:3000)
│  (Vite Dev)     │
└────────┬────────┘
         │ Proxy (/api, /scheduled)
         ↓
┌─────────────────┐
│  Express 服务器 │ (http://localhost:3001)
│  + SQLite DB    │
│  + 本地文件系统 │
└─────────────────┘
```

### 数据存储

| 数据类型 | 本地开发 | 线上部署 |
|---------|---------|---------|
| 桌面数据 (widgets, navigation) | SQLite (kv_store 表) | Cloudflare KV |
| 文件元数据 | SQLite (kv_store 表) | Cloudflare KV |
| 图片/文件 | 本地文件系统 (server/storage/) | Cloudflare R2 |
| 新闻缓存 | SQLite (news_cache 表) | Cloudflare D1 |
| 备份数据 | SQLite (backups 表) | Cloudflare R2 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

这个命令会同时启动:
- Express 本地服务器 (端口 3001)
- Vite 开发服务器 (端口 3000)

### 3. 访问应用

打开浏览器访问: http://localhost:3000

## 项目结构

```
.
├── server/                    # 本地开发服务器
│   ├── index.js              # Express 服务器入口
│   ├── db.js                 # SQLite 数据库配置
│   ├── routes/               # API 路由
│   │   ├── desktop.js        # 桌面数据 API
│   │   ├── image.js          # 图片存储 API
│   │   ├── file.js           # 文件存储 API
│   │   ├── file-metadata.js  # 文件元数据 API
│   │   ├── news.js           # 新闻 API
│   │   ├── backup.js         # 备份 API
│   │   └── restore.js        # 恢复 API
│   ├── news/                 # 新闻抓取模块
│   │   └── index.js          # 新闻源配置
│   ├── data/                 # SQLite 数据库文件 (自动创建)
│   │   └── local.db
│   └── storage/              # 本地文件存储 (自动创建)
│       ├── images/           # 图片文件
│       └── files/            # 上传的文件
├── functions/                # Cloudflare Functions (线上部署)
│   ├── api/                  # API 端点
│   └── scheduled/            # 定时任务
├── src/                      # Vue 3 前端代码
│   ├── stores/desktop.ts     # Pinia store (已移除 localStorage 依赖)
│   └── ...
└── vite.config.ts            # Vite 配置 (包含 API 代理)
```

## API 端点

所有 API 请求会被 Vite 代理到本地 Express 服务器:

| 端点 | 方法 | 说明 |
|-----|------|-----|
| `/api/desktop` | GET/POST/DELETE | 桌面数据 |
| `/api/image` | GET/POST/DELETE | 图片存储 |
| `/api/file` | GET/POST/DELETE | 文件存储 |
| `/api/file-metadata` | GET/POST | 文件元数据 |
| `/api/news` | GET | 新闻数据 |
| `/api/restore` | GET/POST | 备份恢复 |
| `/scheduled/backup` | POST | 创建备份 |

## 数据持久化

### 本地开发

- 所有数据存储在 `server/data/local.db` (SQLite 数据库)
- 文件存储在 `server/storage/` 目录
- 数据库和存储目录会自动创建
- 已添加到 `.gitignore`,不会提交到 Git

### 线上部署

- 数据存储在 Cloudflare KV
- 文件存储在 Cloudflare R2
- 新闻缓存在 Cloudflare D1
- 需要在 Cloudflare Pages 配置环境绑定

## 环境变量

### 本地开发

无需配置环境变量,所有服务都在本地运行。

### 线上部署

需要在 Cloudflare Pages 配置以下绑定:

- **KV namespace**: `DESKTOP_DATA`
- **R2 bucket**: `IMAGE_BUCKET`
- **D1 database**: `NEWS_CACHE_DB`
- **Environment variable**: `VITE_DESKTOP_PASSWORD` (可选)

## 常见问题

### Q: 如何清空本地数据?

删除 `server/data/` 和 `server/storage/` 目录,重启服务器即可。

### Q: 本地数据会同步到线上吗?

不会。本地开发和线上部署使用完全独立的数据存储。

### Q: 如何从本地迁移数据到线上?

可以使用备份功能:
1. 在本地创建备份 (POST `/scheduled/backup`)
2. 下载备份文件
3. 在线上环境恢复备份 (POST `/api/restore`)

### Q: 新闻功能在本地开发时可用吗?

可用,但只实现了部分新闻源 (GitHub, 百度, 知乎)。完整的新闻源需要在线上环境使用。

## 开发注意事项

1. **不要使用 localStorage 存储业务数据**
   - localStorage 仅用于临时 UI 状态 (如当前标签页)
   - 所有业务数据通过 API 持久化

2. **数据保存策略**
   - `save()` 方法会直接调用 `syncToCloud()`
   - 本地开发时,"云端"实际是本地 Express 服务器
   - 线上部署时,"云端"是 Cloudflare 服务

3. **文件上传限制**
   - 本地开发: 20MB (Express multer 配置)
   - 线上部署: 20MB (Cloudflare R2 限制)

4. **数据库初始化**
   - SQLite 数据库会在首次启动时自动创建
   - 表结构在 `server/db.js` 中定义

## 部署到线上

### 构建

```bash
npm run build
```

### 部署到 Cloudflare Pages

1. 连接 GitHub 仓库
2. 配置构建命令: `npm run build`
3. 配置输出目录: `dist`
4. 配置环境绑定 (KV, R2, D1)
5. 部署

详细部署说明请参考 `CLAUDE.md` 文件。

## 技术栈

### 前端
- Vue 3 + TypeScript
- Pinia (状态管理)
- Vite (构建工具)
- Tailwind CSS (样式)

### 本地开发服务器
- Express (Web 框架)
- better-sqlite3 (SQLite 数据库)
- multer (文件上传)
- cheerio (新闻抓取)

### 线上部署
- Cloudflare Pages (托管)
- Cloudflare Functions (Serverless API)
- Cloudflare KV (键值存储)
- Cloudflare R2 (对象存储)
- Cloudflare D1 (SQL 数据库)

## 许可证

MIT
