# Easy Desktop 功能规划

本文档记录待开发的新功能，避免遗忘。

## 新增 Tab

### 1. 网站剪藏 (Web Clipper)
- **功能**: 保存网页内容到站点
- **布局**: 卡片网格 / 列表视图（可切换）
- **存储**: 元数据存 KV，截图/正文存 R2

#### MVP 阶段（Phase 1）
- **内容获取**: 手动输入 URL，自动获取标题和 favicon
- **保存内容**:
  - URL（必须）
  - 标题（自动获取）
  - Favicon（自动获取）
  - 摘要/备注（用户填写）
  - 分类（复用导航站分类）
  - 标签（用户自定义）
- **功能**:
  - 添加/编辑/删除剪藏
  - 分类筛选
  - 标签筛选
  - 搜索功能
  - 卡片/列表视图切换
- **数据结构**:
  ```typescript
  interface WebClip {
    id: string
    url: string
    title: string
    description?: string   // 用户填写的摘要
    favicon?: string       // 网站图标
    category?: string      // 分类
    tags: string[]         // 标签
    createdAt: number
    updatedAt: number
  }
  ```
- **UI 设计**:
  ```
  ┌─────────────────────────────────────────────────────┐
  │  [+ 添加]  [搜索...]     [分类 ▼]  [标签 ▼]  [视图] │
  ├─────────────────────────────────────────────────────┤
  │                                                     │
  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
  │  │ favicon │  │ favicon │  │ favicon │             │
  │  ├─────────┤  ├─────────┤  ├─────────┤             │
  │  │ 标题    │  │ 标题    │  │ 标题    │             │
  │  │ 摘要... │  │ 摘要... │  │ 摘要... │             │
  │  │ [标签]  │  │ [标签]  │  │ [标签]  │             │
  │  └─────────┘  └─────────┘  └─────────┘             │
  │                                                     │
  └─────────────────────────────────────────────────────┘
  ```

#### 后续阶段（Phase 2）
- **截图功能**: 使用 Puppeteer 或第三方 API 生成网页截图
- **正文提取**: 使用 Readability.js 解析网页主要内容
- **阅读模式**: 显示提取的正文，支持离线阅读

#### 扩展阶段（Phase 3）
- **浏览器扩展**: Chrome/Firefox 扩展，一键剪藏
- **批量导入**: 从浏览器书签导入
- **分享功能**: 生成分享链接

### 2. 代码片段库 (Code Snippets)
- **功能**: 收藏常用代码片段
- **布局**: 左右分栏（左侧列表，右侧详情/编辑）
- **技术选型**:
  - 语法高亮: Prism.js（轻量够用）
  - 代码编辑器: CodeMirror（功能强大，有行号）
- **特性**:
  - 语法高亮（支持多种语言）
  - 按语言分类 + 自定义标签
  - 搜索功能
  - 一键复制
  - 代码描述/备注
- **存储**: KV 存储
- **数据结构**:
  ```typescript
  interface CodeSnippet {
    id: string
    title: string
    code: string
    language: string      // javascript, python, sql...
    description?: string
    tags: string[]
    createdAt: number
    updatedAt: number
  }
  ```
- **UI 设计**:
  ```
  ┌─────────────────────────────────────────────────────┐
  │  [+ 新建]  [搜索...]           [语言筛选 ▼]         │
  ├──────────────┬──────────────────────────────────────┤
  │              │                                      │
  │  片段列表     │   代码详情/编辑区                    │
  │              │                                      │
  │  ┌─────────┐ │   标题: API 请求封装                 │
  │  │ fetch   │ │   语言: JavaScript                   │
  │  │ 封装    │ │   标签: [工具] [HTTP]                │
  │  └─────────┘ │                                      │
  │              │   ┌────────────────────────────┐     │
  │  ┌─────────┐ │   │ const fetchAPI = async () │     │
  │  │ SQL     │ │   │   => { ... }               │     │
  │  │ 查询    │ │   └────────────────────────────┘     │
  │  └─────────┘ │                                      │
  │              │   [复制] [编辑] [删除]                │
  │              │                                      │
  └──────────────┴──────────────────────────────────────┘
  ```

---

## 新增桌面组件

### 3. 倒计时组件 (Countdown) ✅ 已完成
- **功能**: 显示距离目标日期的剩余时间
- **特性**:
  - 设置目标日期和标题
  - 显示剩余天数
  - 到期后显示"已到期" + 红色样式
  - 支持添加备注/描述
  - 可调整组件大小
- **组件类型**: `countdown`
- **日期选择器**: VueDatePicker

### 4. 随机决策器组件 (Random Picker) ✅ 已完成
- **功能**: 从决策池中随机抽取一个选项
- **特性**:
  - Canvas 绘制手绘风格转盘（马卡龙色系）
  - 旋转动画（先快后慢缓动效果）
  - 弹窗编辑选项列表
  - 显示本次和上次抽取结果
  - 可调整组件大小
- **组件类型**: `random-picker`

---

## 实现优先级

按从简单到复杂排序：

| 优先级 | 功能 | 复杂度 | 状态 |
|--------|------|--------|------|
| 1 | 倒计时组件 | ⭐ | ✅ 已完成 |
| 2 | 随机决策器组件 | ⭐⭐ | ✅ 已完成 |
| 3 | 代码片段 Tab | ⭐⭐⭐ | 📝 占位页面已创建 |
| 4 | 网站剪藏 Tab | ⭐⭐⭐⭐ | 📝 占位页面已创建 |

---

## 开发检查清单

### 新增组件步骤
1. [x] 在 `src/types/index.ts` 添加类型定义
2. [x] 在 `src/components/widgets/` 创建组件文件
3. [x] 在 `WidgetWrapper.vue` 注册组件
4. [x] 在 `src/stores/desktop.ts` 的 `createWidget()` 添加创建逻辑
5. [x] 在 `Toolbar.vue` 添加工具栏按钮
6. [x] 在 `Taskbar.vue` 添加类型名称和图标
7. [ ] 如需搜索支持，在 store 的 `searchResults` 添加

### 新增 Tab 步骤
1. [x] 在 `src/types/index.ts` 更新 `TabType` 联合类型
2. [x] 创建页面组件 `src/components/XxxPage.vue`
3. [x] 在 `App.vue` 添加路由渲染
4. [x] 在 `TabBar.vue` 添加 tab 图标
5. [ ] 在 store 添加相关状态和方法
6. [ ] 如需云存储，添加 API 端点

---

## 代码片段 Tab 开发清单

### 依赖安装
```bash
npm install prismjs @types/prismjs codemirror @codemirror/lang-javascript @codemirror/lang-python @codemirror/lang-sql @codemirror/lang-html @codemirror/lang-css @codemirror/theme-one-dark
```

### 开发步骤
1. [ ] 在 `src/types/index.ts` 添加 `CodeSnippet` 接口
2. [ ] 在 `src/stores/desktop.ts` 添加代码片段相关状态和方法
3. [ ] 创建 `CodeSnippetsPage.vue` 主页面（左右分栏布局）
4. [ ] 创建 `SnippetList.vue` 片段列表组件
5. [ ] 创建 `SnippetEditor.vue` 编辑器组件（CodeMirror）
6. [ ] 创建 `SnippetDetail.vue` 详情展示组件（Prism.js 高亮）
7. [ ] 添加搜索和语言筛选功能
8. [ ] 添加标签管理功能
9. [ ] 添加 API 端点（如需单独存储）

---

## 网站剪藏 Tab 开发清单

### MVP 阶段开发步骤
1. [ ] 在 `src/types/index.ts` 添加 `WebClip` 接口
2. [ ] 在 `src/stores/desktop.ts` 添加网站剪藏相关状态和方法
3. [ ] 创建 `WebClipperPage.vue` 主页面（卡片网格布局）
4. [ ] 创建 `ClipCard.vue` 剪藏卡片组件
5. [ ] 创建 `ClipFormDialog.vue` 添加/编辑表单弹窗
6. [ ] 实现自动获取网页标题和 favicon 功能
7. [ ] 添加分类筛选功能（复用导航站分类）
8. [ ] 添加标签管理功能
9. [ ] 添加搜索功能
10. [ ] 添加卡片/列表视图切换

### 后续阶段开发步骤
1. [ ] 添加截图功能（Puppeteer / 第三方 API）
2. [ ] 添加正文提取功能（Readability.js）
3. [ ] 创建阅读模式组件
4. [ ] 开发浏览器扩展（Chrome/Firefox）

---

## 进度记录

- [x] 倒计时组件 (2026-01-16)
- [x] 随机决策器组件 (2026-01-16)
- [ ] 代码片段 Tab
- [ ] 网站剪藏 Tab

---

*创建日期: 2026-01-16*
*最后更新: 2026-01-16*
