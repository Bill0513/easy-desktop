# 云桌面 - Cloud Desktop

一个手绘风格的在线桌面应用，可以记录待办事项、随手记、书签等，支持自由拖拽和分组。

## 功能特性

- 📝 **便签** - 记录临时想法和笔记
- ✅ **待办事项** - 管理任务清单
- 🔖 **书签** - 保存常用网站
- 📄 **文本块** - 记录重要文本
- 🖼️ **图片** - 上传和展示图片
- 📋 **Markdown** - 支持 Markdown 编辑和预览
- 🗂️ **导航管理** - 网站书签分类管理
- 📰 **新闻聚合** - 多源新闻浏览
- 🖱️ **自由拖拽** - 在网格上自由放置组件
- ☁️ **云端同步** - 数据保存到 Cloudflare KV
- 💾 **自动备份** - 每日自动备份到 R2，支持恢复
- 🔒 **密码保护** - 6 位数字密码保护

## 技术栈

- Vue 3 + TypeScript
- Pinia 状态管理
- Tailwind CSS
- Cloudflare Pages Functions + KV + R2
- GitHub Actions（自动备份）

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 构建部署

```bash
npm run build
```

## Cloudflare 部署

### 前置准备

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```

### 部署步骤

#### 1. 创建 KV 命名空间

```bash
npx wrangler kv:namespace create "DESKTOP_DATA"
```

记下返回的 KV namespace ID（类似 `abc123def456...`）

#### 2. 创建 D1 数据库（新闻缓存）

```bash
npx wrangler d1 create news-cache-db
```

记下返回的 database_id

#### 3. 配置 wrangler.toml

在项目根目录创建 `wrangler.toml`:

```toml
name = "cloud-desktop"
pages_build_output_dir = "dist"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "NEWS_CACHE_DB"
database_name = "news_cache_db"
database_id = "your-database-id-here"
```

#### 4. 初始化 D1 数据库表

```bash
npx wrangler d1 execute news-cache-db --command "
CREATE TABLE IF NOT EXISTS news_cache (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
)"
```

#### 5. 构建前端

```bash
npm run build
```

#### 6. 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name=cloud-desktop
```

首次部署会创建项目，后续部署会自动更新。

#### 7. 绑定 KV 命名空间和 R2 存储桶

在 [Cloudflare Dashboard](https://dash.cloudflare.com) 中：

1. 进入 **Workers & Pages** → 找到 `cloud-desktop` 项目
2. 点击 **Settings** → **Functions**
3. **KV namespace bindings**：
   - 点击 **Add binding**
   - Variable name: `DESKTOP_DATA`
   - KV namespace: 选择第 1 步创建的 KV
4. **R2 bucket bindings**：
   - 点击 **Add binding**
   - Variable name: `IMAGE_BUCKET`
   - R2 bucket: 选择或创建一个 R2 存储桶
5. **D1 database bindings**（已通过 wrangler.toml 配置）：
   - Variable name: `NEWS_CACHE_DB`
   - D1 database: 自动绑定
6. 保存设置

#### 8. 重新部署使配置生效

```bash
npm run build
npx wrangler pages deploy dist --project-name=cloud-desktop
```

完成！访问 Cloudflare 提供的 URL（如 `https://cloud-desktop.pages.dev`）

### 后续更新

每次修改代码后，只需运行：

```bash
npm run build && npx wrangler pages deploy dist --project-name=cloud-desktop
```

### 使用 Git 集成（可选）

也可以通过 Git 自动部署：

1. 将代码推送到 GitHub/GitLab
2. 在 Cloudflare Dashboard 中连接仓库
3. 配置构建设置：
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 每次 push 代码自动部署

### 配置自动备份（推荐）

使用 GitHub Actions 实现每日自动备份：

1. **配置 GitHub Secret**：
   - 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
   - 点击 **New repository secret**
   - Name: `BACKUP_DOMAIN`
   - Value: 你的域名（例如 `your-app.pages.dev`，不要加 `https://`）

2. **验证配置**：
   - 进入 GitHub 仓库 → **Actions** 标签页
   - 找到 "Daily Backup" 工作流
   - 点击 **Run workflow** 手动测试一次

3. **自动运行**：
   - 每天凌晨 2:00 UTC（北京时间上午 10:00）自动备份
   - 备份文件保存到 R2 存储桶
   - 自动清理 30 天前的旧备份

## 使用说明

### 基本操作
- 点击顶部工具栏添加不同类型的组件
- 拖动组件标题栏移动位置
- 双击标题编辑组件名称
- 数据自动保存到云端（每 5 分钟同步一次）

### 备份与恢复
- 在应用中打开备份管理界面
- 点击"立即备份"手动创建备份
- 选择备份文件点击"恢复"可恢复历史数据
- 恢复操作会覆盖当前所有数据，请谨慎操作

## 设计风格

采用手绘风格设计，特点：
- 不规则的圆角边框
- 手写字体（Kalam + Patrick Hand）
- 硬阴影效果
- 纸张纹理背景
