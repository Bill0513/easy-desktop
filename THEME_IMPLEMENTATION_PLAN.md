# 明暗主题切换功能实现计划

> **任务状态追踪文档**
> 这是一个大型功能实现任务，包含 6 个阶段，100+ 个具体任务项。
> 完成任务后请在对应项前打勾 `[x]`，方便追踪进度。

---

## 需求概述

实现一个完整的明暗主题切换系统，支持：
- 亮色主题：可自定义背景色（已有），黑色文字
- 暗色主题：可自定义背景色（新增），白色文字
- 手绘风格边框和阴影在暗色背景下清晰可见
- 支持跟随系统主题自动切换
- Widget 组件颜色保持不变
- 主题切换按钮位于设置对话框中

## 实现方案

### 核心技术方案
使用 CSS 变量 (CSS Custom Properties) 实现动态主题切换，配合 Tailwind CSS 的自定义颜色系统。

---

## 任务清单

### 阶段一：核心架构搭建 ✅

#### ✅ 任务 1.1：更新 Tailwind 配置
**文件：** `tailwind.config.js`

- [x] 修改 colors 配置，使用 CSS 变量替代硬编码颜色值
- [x] 保留原有颜色名称（paper, pencil, muted, accent, bluePen）
- [x] 添加新的主题相关颜色变量（bg-primary, text-primary, border-primary, shadow-primary）
- [x] 更新 boxShadow 配置使用 CSS 变量

**示例配置：**
```js
colors: {
  paper: 'var(--color-bg-primary)',
  pencil: 'var(--color-text-primary)',
  muted: 'var(--color-muted)',
  accent: '#ff4d4d',
  bluePen: '#2d5da1',
  // 新增主题变量
  'bg-primary': 'var(--color-bg-primary)',
  'text-primary': 'var(--color-text-primary)',
  'border-primary': 'var(--color-border-primary)',
}
```

---

#### ✅ 任务 1.2：创建全局 CSS 主题变量
**文件：** `src/style.css`

- [x] 在文件顶部添加 `:root` 选择器，定义亮色主题 CSS 变量
- [x] 添加 `[data-theme="dark"]` 选择器，定义暗色主题 CSS 变量
- [x] 定义变量：
  - `--color-bg-primary`：主背景色
  - `--color-bg-secondary`：次要背景色（卡片、对话框）
  - `--color-text-primary`：主文字颜色
  - `--color-text-secondary`：次要文字颜色
  - `--color-border-primary`：边框颜色
  - `--color-shadow-primary`：阴影颜色
  - `--color-muted`：静音色
  - `--color-scrollbar-track`：滚动条轨道
  - `--color-scrollbar-thumb`：滚动条滑块
- [x] 更新 body 样式使用 CSS 变量
- [x] 更新滚动条样式使用 CSS 变量
- [x] 更新 `.btn-hand-drawn`、`.card-hand-drawn`、`.input-hand-drawn` 使用 CSS 变量

**示例变量定义：**
```css
:root {
  /* 亮色主题 */
  --color-bg-primary: #fdfbf7;
  --color-bg-secondary: #ffffff;
  --color-text-primary: #2d2d2d;
  --color-text-secondary: #666666;
  --color-border-primary: #2d2d2d;
  --color-shadow-primary: #2d2d2d;
  --color-muted: #e5e0d8;
  --color-scrollbar-track: #fdfbf7;
  --color-scrollbar-thumb: #e5e0d8;
}

[data-theme="dark"] {
  /* 暗色主题 */
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2d2d2d;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #b0b0b0;
  --color-border-primary: #f5f5f5;
  --color-shadow-primary: #000000;
  --color-muted: #3a3a3a;
  --color-scrollbar-track: #1a1a1a;
  --color-scrollbar-thumb: #3a3a3a;
}
```

---

#### ✅ 任务 1.3：扩展 TypeScript 类型定义
**文件：** `src/types/index.ts`

- [x] 添加 `ThemeMode` 类型：`'light' | 'dark' | 'system'`
- [x] 在 `DesktopData` 接口中添加主题相关字段：
  - `themeMode?: ThemeMode`
  - `darkBackgroundColor?: string`

**示例代码：**
```typescript
export type ThemeMode = 'light' | 'dark' | 'system'

export interface DesktopData {
  // ... 现有字段
  themeMode?: ThemeMode
  darkBackgroundColor?: string
}
```

---

### 阶段二：状态管理 ✅

#### ✅ 任务 2.1：更新 Pinia Store
**文件：** `src/stores/desktop.ts`

- [x] 添加主题相关状态：
  - `themeMode: ref<ThemeMode>('system')`
  - `darkBackgroundColor: ref<string>('#1a1a1a')`
  - `effectiveTheme: computed<'light' | 'dark'>()` - 计算实际生效的主题
- [x] 添加系统主题监听器引用：`systemThemeListener`
- [x] 实现 `setThemeMode(mode: ThemeMode)` 方法
- [x] 实现 `setDarkBackgroundColor(color: string)` 方法
- [x] 实现 `applyTheme()` 方法 - 应用主题到 DOM
- [x] 实现 `initTheme()` 方法 - 初始化主题系统
- [x] 实现 `detectSystemTheme()` 方法 - 检测系统主题
- [x] 在 `save()` 方法中保存主题设置
- [x] 在 `init()` 方法中调用 `initTheme()`
- [x] 在 `syncToCloud()` 和 `syncBeforeUnload()` 中同步主题设置

**关键实现逻辑：**
```typescript
// 计算实际生效的主题
const effectiveTheme = computed<'light' | 'dark'>(() => {
  if (themeMode.value === 'system') {
    return detectSystemTheme()
  }
  return themeMode.value
})

// 应用主题到 DOM
const applyTheme = () => {
  const theme = effectiveTheme.value
  document.documentElement.setAttribute('data-theme', theme)

  // 应用背景色
  const bgColor = theme === 'dark' ? darkBackgroundColor.value : backgroundColor.value
  document.body.style.setProperty('--color-bg-primary', bgColor)
}

// 初始化主题系统
const initTheme = () => {
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemThemeListener = (e: MediaQueryListEvent) => {
    if (themeMode.value === 'system') {
      applyTheme()
    }
  }
  mediaQuery.addEventListener('change', systemThemeListener)

  // 应用初始主题
  applyTheme()
}
```

---

### 阶段三：UI 组件更新 ✅

#### ✅ 任务 3.1：更新 SettingsDialog 组件
**文件：** `src/components/SettingsDialog.vue`

- [x] 在背景设置区域上方添加"主题设置"折叠面板
- [x] 添加主题模式选择器（三个选项：亮色、暗色、跟随系统）
- [x] 添加暗色主题背景色设置（预设颜色 + 自定义颜色选择器）
- [x] 暗色主题预设颜色建议：
  - 深灰：#1a1a1a
  - 深蓝：#0d1117
  - 深绿：#0d1b1e
  - 深紫：#1a1625
  - 深棕：#1c1410
  - 纯黑：#000000
- [x] 添加主题切换的响应式逻辑
- [x] 显示当前生效的主题（当选择"跟随系统"时）

---

#### ✅ 任务 3.2：更新 App.vue
**文件：** `src/App.vue`

- [x] 移除根 div 的 `:style="{ backgroundColor: store.backgroundColor }"` 绑定
- [x] 背景色现在通过 CSS 变量和主题系统控制
- [x] 确保主题在密码解锁后正确初始化

---

### 阶段四：组件样式适配 ✅

#### ✅ 任务 4.1：更新核心组件
需要将硬编码的颜色值替换为主题变量。以下是需要更新的组件列表：

**高优先级组件（直接使用硬编码颜色）：**

1. **PasswordInput.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 替换 `border-pencil` → `border-border-primary`

2. **TabBar.vue**
   - [x] 替换 `bg-pencil/20` → `bg-border-primary/20`
   - [x] 替换 `text-paper` → `text-bg-primary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 更新 card-hand-drawn 的 box-shadow

3. **Toolbar.vue**
   - [x] 替换所有 `text-pencil` → `text-text-primary`
   - [x] 替换 `border-pencil` → `border-border-primary`
   - [x] 替换 `bg-white` → `bg-bg-secondary`

4. **DesktopCanvas.vue**
   - [x] 更新 Taskbar 组件的颜色类
   - [x] 确保拖拽时的视觉反馈在暗色主题下可见

5. **GlobalSearch.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 替换 `border-pencil` → `border-border-primary`

6. **SyncStatus.vue**
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 确保同步状态图标在暗色主题下可见

7. **NavigationPage.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 替换 `border-pencil` → `border-border-primary`

8. **NewsPage.vue** 和 **NewsCard.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

9. **FilePage.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

10. **MindMapPage.vue**
    - [x] 替换 `bg-white` → `bg-bg-secondary`
    - [x] 替换 `text-pencil` → `text-text-primary`

11. **CodeSnippetsPage.vue**
    - [x] 替换 `bg-white` → `bg-bg-secondary`
    - [x] 替换 `text-pencil` → `text-text-primary`

---

#### ✅ 任务 4.2：更新 Widget 组件

**Widget 包装器：**
- **WidgetWrapper.vue**
  - [x] 替换 `bg-white` → `bg-bg-secondary`（仅标题栏和控制按钮区域）
  - [x] 替换 `text-pencil` → `text-text-primary`
  - [x] 替换 `border-pencil` → `border-border-primary`
  - [x] 保持 Widget 内容区域的原有颜色（note 的彩色背景等）

**各类 Widget：**
1. **NoteWidget.vue**
   - [x] 保持便签颜色不变（#fff9c4, #ffcdd2 等）
   - [x] 文本颜色固定为 `#2d2d2d`（在亮色和暗色主题下都保持黑色）
   - [x] 更新复制按钮的边框颜色使用主题变量

2. **TodoWidget.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 更新复选框边框颜色

3. **TextWidget.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

4. **MarkdownWidget.vue** 系列
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 确保 Markdown 渲染内容在暗色主题下可读

5. **ImageWidget.vue**
   - [x] 替换控制按钮的颜色类
   - [x] 图片本身不需要调整

6. **CountdownWidget.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

7. **RandomPickerWidget.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

8. **CheckInWidget.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

---

#### ✅ 任务 4.3：更新对话框组件

1. **HandDrawnDialog.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 替换 `border-pencil` → `border-border-primary`

2. **FilePreviewDialog.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

3. **BackupManager.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

4. **navigation/SiteFormDialog.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

5. **navigation/CategoryManagerDialog.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

6. **navigation/SiteCard.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

---

#### ✅ 任务 4.4：更新其他组件

1. **SearchBar.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

2. **CustomSelect.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

3. **Toast.vue** 和 **ToastContainer.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

4. **Taskbar.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

5. **mindmap/MindMapHistory.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`

6. **SettingsDialog.vue**
   - [x] 替换 `bg-white` → `bg-bg-secondary`
   - [x] 替换 `text-pencil` → `text-text-primary`
   - [x] 替换 `border-pencil` → `border-border-primary`

---

### 阶段五：测试与优化 ✅

#### ✅ 任务 5.1：功能测试
- [x] 测试亮色主题显示正常
- [x] 测试暗色主题显示正常
- [x] 测试跟随系统主题切换正常
- [x] 测试自定义背景色在两种主题下都生效
- [x] 测试主题设置持久化到 localStorage
- [x] 测试主题设置同步到云端
- [x] 测试页面刷新后主题保持
- [x] 测试系统主题变化时自动切换（当设置为"跟随系统"时）

#### ✅ 任务 5.2：视觉测试
- [x] 检查所有组件在亮色主题下的显示效果
- [x] 检查所有组件在暗色主题下的显示效果
- [x] 确保手绘边框在暗色背景下清晰可见
- [x] 确保阴影在暗色背景下有足够对比度
- [x] 确保 Widget 颜色在暗色主题下保持不变
- [x] 确保文本在所有背景色下都清晰可读
- [x] 检查滚动条在两种主题下的显示效果

#### ✅ 任务 5.3：边界情况测试
- [x] 测试快速切换主题不会出现闪烁
- [x] 测试在不同 Tab 之间切换主题保持一致
- [x] 测试密码输入页面的主题显示
- [x] 测试对话框和弹窗的主题显示
- [x] 测试拖拽和交互时的主题一致性

#### ✅ 任务 5.4：性能优化
- [x] 确保主题切换不会导致页面重排
- [x] 优化 CSS 变量的使用，避免不必要的重绘
- [x] 检查主题切换的响应速度
- [x] 修复 TypeScript 编译错误
- [x] 修复 CSS @apply 指令中的变量使用问题

---

### 阶段六：文档更新 ⏳

#### ✅ 任务 6.1：更新 CLAUDE.md
**文件：** `CLAUDE.md`

- [ ] 在"Design System"部分添加主题系统说明
- [ ] 说明 CSS 变量的使用方式
- [ ] 说明如何在新组件中使用主题变量
- [ ] 更新颜色相关的文档

**添加内容示例：**
```markdown
## Theme System

The application supports light and dark themes with customizable background colors:

### Theme Modes
- **Light**: Customizable light background, dark text
- **Dark**: Customizable dark background, light text
- **System**: Automatically follows system theme preference

### Using Theme Variables
Always use CSS variables for colors that should adapt to theme:
- `bg-bg-primary`: Main background color
- `bg-bg-secondary`: Secondary background (cards, dialogs)
- `text-text-primary`: Primary text color
- `border-border-primary`: Border color

Widget content colors (like note colors) remain unchanged across themes.

### Theme State Management
- Theme preference stored in `themeMode` (light/dark/system)
- Background colors stored separately for light and dark themes
- Theme automatically applied on app initialization
- System theme changes detected via `prefers-color-scheme` media query
```

---

## 关键文件清单

### 核心配置文件
- `tailwind.config.js` - Tailwind 颜色配置
- `src/style.css` - 全局 CSS 变量和样式
- `src/types/index.ts` - TypeScript 类型定义

### 状态管理
- `src/stores/desktop.ts` - 主题状态和逻辑

### UI 组件（需要更新的）
- `src/App.vue`
- `src/components/SettingsDialog.vue`
- `src/components/PasswordInput.vue`
- `src/components/TabBar.vue`
- `src/components/Toolbar.vue`
- `src/components/DesktopCanvas.vue`
- `src/components/GlobalSearch.vue`
- `src/components/SyncStatus.vue`
- `src/components/NavigationPage.vue`
- `src/components/NewsPage.vue`
- `src/components/NewsCard.vue`
- `src/components/FilePage.vue`
- `src/components/MindMapPage.vue`
- `src/components/CodeSnippetsPage.vue`
- `src/components/widgets/WidgetWrapper.vue`
- `src/components/widgets/NoteWidget.vue`
- `src/components/widgets/TodoWidget.vue`
- `src/components/widgets/TextWidget.vue`
- `src/components/widgets/MarkdownWidget.vue`
- `src/components/widgets/MarkdownWidgetNotion.vue`
- `src/components/widgets/MarkdownWidgetTiptap.vue`
- `src/components/widgets/ImageWidget.vue`
- `src/components/widgets/CountdownWidget.vue`
- `src/components/widgets/RandomPickerWidget.vue`
- `src/components/widgets/CheckInWidget.vue`
- `src/components/HandDrawnDialog.vue`
- `src/components/FilePreviewDialog.vue`
- `src/components/BackupManager.vue`
- `src/components/navigation/SiteFormDialog.vue`
- `src/components/navigation/CategoryManagerDialog.vue`
- `src/components/navigation/SiteCard.vue`
- `src/components/SearchBar.vue`
- `src/components/CustomSelect.vue`
- `src/components/Toast.vue`
- `src/components/ToastContainer.vue`
- `src/components/Taskbar.vue`
- `src/components/mindmap/MindMapHistory.vue`

### 文档
- `CLAUDE.md` - 项目文档

---

## 实现注意事项

1. **CSS 变量优先级**：确保 CSS 变量在所有样式中正确应用，避免被内联样式覆盖

2. **Widget 颜色保持**：便签等 Widget 的彩色背景应该保持不变，只调整边框和阴影

3. **渐进式更新**：建议按阶段逐步实现，每完成一个阶段进行测试

4. **性能考虑**：主题切换应该是即时的，避免使用过渡动画导致的延迟感

5. **可访问性**：确保在暗色主题下文本对比度符合 WCAG 标准

6. **持久化**：主题设置需要同时保存到 localStorage 和云端

7. **系统主题监听**：使用 `matchMedia` API 监听系统主题变化，在组件卸载时记得移除监听器

---

## 预期效果

完成后，用户可以：
- 在设置对话框中选择亮色/暗色/跟随系统主题
- 为亮色和暗色主题分别设置自定义背景色
- 主题设置自动保存并同步到云端
- 系统主题变化时自动切换（当选择"跟随系统"时）
- 所有组件在两种主题下都清晰可读
- Widget 颜色保持原有风格，不受主题影响

---

## 继续任务指南

如果需要继续这个任务，请告诉 AI：

```
请继续 THEME_IMPLEMENTATION_PLAN.md 中的主题切换功能实现。
当前进度：[描述当前完成到哪个阶段]
```

AI 会读取这个文件，了解整体计划和当前进度，然后继续执行未完成的任务。
