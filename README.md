# 云桌面 - Cloud Desktop

一个手绘风格的在线桌面应用，可以记录待办事项、随手记、书签等，支持自由拖拽和分组。

## 功能特性

- 📝 **便签** - 记录临时想法和笔记
- ✅ **待办事项** - 管理任务清单
- 🔖 **书签** - 保存常用网站
- 📄 **文本块** - 记录重要文本
- 📁 **文件夹** - 收纳整理组件
- 📦 **组** - 打包多个组件
- 🖱️ **自由拖拽** - 在网格上自由放置组件
- ☁️ **云端同步** - 数据保存到 Cloudflare KV

## 技术栈

- Vue 3 + TypeScript
- Pinia 状态管理
- Tailwind CSS
- Cloudflare Pages Functions + KV

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

#### 2. 构建前端

```bash
npm run build
```

#### 3. 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name=cloud-desktop
```

首次部署会创建项目，后续部署会自动更新。

#### 4. 绑定 KV 命名空间

在 [Cloudflare Dashboard](https://dash.cloudflare.com) 中：

1. 进入 **Workers & Pages** → 找到 `cloud-desktop` 项目
2. 点击 **Settings** → **Functions** → **KV namespace bindings**
3. 点击 **Add binding**
   - Variable name: `DESKTOP_DATA`
   - KV namespace: 选择第 1 步创建的 KV
4. 保存设置

#### 5. 重新部署使配置生效

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

## 使用说明

- 点击顶部工具栏添加不同类型的组件
- 拖动组件标题栏移动位置
- 右键点击组件打开操作菜单
- 数据自动保存到云端

## 设计风格

采用手绘风格设计，特点：
- 不规则的圆角边框
- 手写字体（Kalam + Patrick Hand）
- 硬阴影效果
- 纸张纹理背景
