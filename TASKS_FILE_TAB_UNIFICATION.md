# 文件 Tab 整合任务追踪

> 目标：将“代码片段能力”并入文件模块，统一为“上传 + 直接创建文本/代码文件”。

## 范围与约束

- 直接创建仅支持文本/代码文件（如 `ts/js/py/md/json/vue/css/html/txt`）。
- 文件来源固定为两类：上传文件、直接创建文本/代码文件。
- 旧代码片段数据不迁移、不处理（仅停止在 UI 中使用）。

## 里程碑任务

### P0 - 架构与入口收敛

- [x] P0-01 移除 `代码片段` Tab 入口与页面挂载
- [x] P0-02 清理全局搜索中代码片段跳转分支
- [x] P0-03 更新 `TabType`，移除 `'code-snippets'`
- [x] P0-04 修复 `loadActiveTab`，支持所有有效 Tab 恢复
- [x] P0-05 删除废弃页面 `src/components/CodeSnippetsPage.vue`

### P1 - 文件模型增强

- [x] P1-01 扩展 `FileItem` 元数据（`language/tags/description/isTextEditable`）
- [x] P1-02 Store 增加文本/代码识别能力（扩展名、语言推断）
- [x] P1-03 Store 增加 `createTextFile`（仅文本/代码）
- [x] P1-04 Store 增加 `updateTextFileContent`（重新上传并替换指针）
- [x] P1-05 Store 增加 `updateFileMetadata`
- [x] P1-06 全局搜索覆盖文件 `name + language + tags + description`

### P2 - 文件页产品能力

- [x] P2-01 工具栏新增“新建文件”入口
- [x] P2-02 右键菜单新增“新建文本/代码文件”入口
- [x] P2-03 新建文件弹窗（文件名 + 扩展类型）
- [x] P2-04 双击文件：文本/代码进入编辑，其他走预览
- [x] P2-05 编辑器支持保存（`Ctrl/Cmd + S`）
- [x] P2-06 编辑器关闭时处理未保存提示
- [x] P2-07 文件列表支持语言/标签/关键字筛选

### P3 - 验证与交付

- [x] P3-01 运行构建检查（`npm run build`）
- [x] P3-02 确认无 `code-snippets` 引用残留（前端路径）
- [ ] P3-03 人工回归：上传、重命名、删除、复制/剪切/粘贴
- [ ] P3-04 人工回归：新建文本文件 -> 编辑 -> 保存 -> 刷新验证

## 完成定义（DoD）

- [ ] 文件 Tab 能独立完成：上传文件 + 新建文本/代码文件 + 编辑保存。
- [ ] UI 不再出现“代码片段”一级入口。
- [ ] 新建文件严格限制为文本/代码格式。
- [ ] 构建通过，无类型错误。
