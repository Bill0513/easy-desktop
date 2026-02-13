# AGENTS Instructions

## Code Map 自动更新规则（强制）

在任何任务完成后，只要本次改动涉及 `src/`、`server/` 或 `functions/` 下的代码/文档，必须执行：

`npm run code-map:build`

执行要求：
1. 在最终回复前执行该命令。
2. 如果命令失败，必须报告失败原因，且不能宣称任务已完全完成。
3. 如果本次没有改动上述路径，可跳过，但必须在最终回复中明确说明跳过原因。
4. 最终回复中必须明确说明是否已执行 `npm run code-map:build`。

## Code Map 索引位置

当需要进行项目结构、模块功能点、问题定位分析时，优先读取以下索引文件：

1. `docs/code-map/index.json`（机器可读，优先）
2. `docs/code-map/index.md`（人工可读摘要）

使用规则：
1. 在做架构分析或模块定位前，先读取 `docs/code-map/index.json`。
2. 如果 `src/`、`server/`、`functions/` 有变更，先执行 `npm run code-map:build` 再分析。
3. 如果索引与实际代码冲突，以代码为准，并立即重建索引。
