# Easy Desktop 功能规划

本文档记录待开发的新功能，避免遗忘。

## 新增 Tab

### 1. 网站剪藏 (Web Clipper)
- **功能**: 保存网页内容到站点
- **特性**:
  - 支持保存网页标题、URL、正文内容、截图
  - 分类管理（可复用导航站的分类系统）
  - 标签系统
  - 全文搜索
  - 列表/卡片视图切换
- **存储**: 内容存 KV，截图/附件存 R2
- **扩展**: 可能需要开发浏览器扩展配合一键剪藏

### 2. 代码片段库 (Code Snippets)
- **功能**: 收藏常用代码片段
- **特性**:
  - 语法高亮（支持多种语言）
  - 分类/标签管理
  - 搜索功能
  - 一键复制
  - 代码描述/备注
- **存储**: KV 存储
- **参考**: 类似 GitHub Gist 的简化版

---

## 新增桌面组件

### 3. 倒计时组件 (Countdown)
- **功能**: 显示距离目标日期的剩余时间
- **特性**:
  - 设置目标日期和标题
  - 显示"还有 X 天 X 小时 X 分钟"
  - 支持多个倒计时组件
  - 到期提醒/样式变化
- **组件类型**: `countdown`
- **数据结构**:
  ```typescript
  interface CountdownWidget extends BaseWidget {
    type: 'countdown'
    title: string
    targetDate: string // ISO 日期字符串
  }
  ```

### 4. 随机决策器组件 (Random Picker)
- **功能**: 从决策池中随机抽取一个选项
- **特性**:
  - 自定义决策池标题（如"今天吃什么"）
  - 添加/删除选项
  - 点击按钮随机抽取
  - 抽取动画效果
  - 可保存多个决策池（多个组件）
- **组件类型**: `random-picker`
- **数据结构**:
  ```typescript
  interface RandomPickerWidget extends BaseWidget {
    type: 'random-picker'
    title: string
    options: string[]
    lastResult?: string
  }
  ```

---

## 实现优先级

按从简单到复杂排序：

| 优先级 | 功能 | 复杂度 | 说明 |
|--------|------|--------|------|
| 1 | 倒计时组件 | ⭐ | 最简单，熟悉组件开发流程 |
| 2 | 随机决策器组件 | ⭐⭐ | 需要管理选项列表 |
| 3 | 代码片段 Tab | ⭐⭐⭐ | 类似导航站，需要语法高亮库 |
| 4 | 网站剪藏 Tab | ⭐⭐⭐⭐ | 最复杂，可能需要浏览器扩展 |

---

## 开发检查清单

### 新增组件步骤
1. [ ] 在 `src/types/index.ts` 添加类型定义
2. [ ] 在 `src/components/widgets/` 创建组件文件
3. [ ] 在 `WidgetWrapper.vue` 注册组件
4. [ ] 在 `src/stores/desktop.ts` 的 `createWidget()` 添加创建逻辑
5. [ ] 在 `Toolbar.vue` 添加工具栏按钮
6. [ ] 在 `Taskbar.vue` 添加类型名称和图标
7. [ ] 如需搜索支持，在 store 的 `searchResults` 添加

### 新增 Tab 步骤
1. [ ] 在 `src/types/index.ts` 更新 `TabType` 联合类型
2. [ ] 创建页面组件 `src/components/XxxPage.vue`
3. [ ] 在 `App.vue` 添加路由渲染
4. [ ] 在 `TabBar.vue` 添加 tab 图标
5. [ ] 在 store 添加相关状态和方法
6. [ ] 如需云存储，添加 API 端点

---

## 进度记录

- [ ] 倒计时组件
- [ ] 随机决策器组件
- [ ] 代码片段 Tab
- [ ] 网站剪藏 Tab

---

*创建日期: 2026-01-16*
