# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production (runs TypeScript check + Vite build)
npm run preview      # Preview production build
```

## Project Overview

A hand-drawn style online desktop application built with Vue 3 + TypeScript. Users can create, drag, and organize widgets (notes, todos, bookmarks, text blocks, folders, images, markdown) on a grid canvas. Features a tab-based interface with desktop workspace and news feed.

## Architecture

### Component Hierarchy
- `App.vue` - Root component with password protection, tab routing, and global keyboard shortcuts
  - `PasswordInput.vue` - 6-digit numeric password entry (configurable via `VITE_DESKTOP_PASSWORD` env var)
  - `TabBar.vue` - Left-side hover-expandable tab switcher (desktop/news)
  - Desktop Tab:
    - `Toolbar.vue` - Top toolbar for adding widgets with icon labels
    - `DesktopCanvas.vue` - Main canvas with drag/drop, grid snapping, folder detection
    - `WidgetWrapper.vue` - Container for all widget types with title bar, controls
    - `GlobalSearch.vue` - Keyboard-accessible search modal (Ctrl/Cmd+F, desktop tab only)
  - News Tab:
    - `NewsPage.vue` - News aggregator with source filtering

### Tab System
- Two tabs: `desktop` (workspace) and `news` (news feed)
- Tab state persisted to localStorage via `TAB_STORAGE_KEY`
- Global search (Ctrl/Cmd+F) only active in desktop tab
- Tab switching via `TabBar.vue` (left-side hover menu)

### Widget System
All widgets extend `BaseWidget` with type-specific properties (defined in `src/types/index.ts`):
- **note** - Sticky notes with 6 color options and one-click copy
- **todo** - Task lists with checkable items, inline editing (double-click), hover backgrounds, IME-aware input
- **bookmark** - URL bookmarks collection
- **folder** - Container that holds references to other widgets via `children: string[]`
- **text** - Large text content blocks with one-click copy
- **image** - Image display with zoom/scale controls, stored in Cloudflare R2
- **markdown** - Markdown editor with edit/preview toggle, one-click copy, uses `marked` library

Widget features:
- Double-click title to edit (hand-drawn style input with wobbly borders)
- Minimize/maximize/close controls
- Drag to move (grid snapping)
- Copy button on note/text/markdown widgets
- Todo items support: hover backgrounds, double-click to edit, IME composition events for Chinese input

When adding new widget types:
1. Add type to `WidgetType` union in `src/types/index.ts`
2. Create interface extending `BaseWidget`
3. Add to `Widget` union type
4. Create component in `src/components/widgets/`
5. Register in `WidgetWrapper.vue` component map
6. Add creation case in `createWidget()` in `src/stores/desktop.ts`
7. Add to `typeNames` and `getWidgetIcon()` in `Taskbar.vue`
8. Add search support in `searchResults` computed in store (if applicable)
9. Add toolbar button in `Toolbar.vue`

### State Management (`src/stores/desktop.ts`)
Single Pinia store managing:
- All widgets array with position (x, y), size, z-index, minimize/maximize state
- Selection and drag state
- Global search state (`isSearchOpen`, `searchQuery`, `searchResults`)
- Tab state (`activeTab`: 'desktop' | 'news')
- News state (`newsSources`, `isLoadingNews`, `enabledSources`)
- Persistence to localStorage + optional Cloudflare KV

Key methods:
- `createWidget()` - Factory for all widget types with default sizes
- `updatePositionNoSave()` - Update position without triggering save (use during drag)
- `save()` - Persist to both localStorage and cloud
- `deleteImageWidget()` - Special deletion that also removes from R2
- `updateTodoItem()` - Update todo item text (supports inline editing)
- `setActiveTab()` - Switch between desktop/news tabs
- `fetchNews()` / `fetchNewsBySource()` - Load news data with caching

### Drag & Drop System
- Custom mouse event-based drag (not HTML5 drag API) in `DesktopCanvas.vue`
- Grid snapping (20px) during drag
- Folder detection on drag end - component center must be within folder bounds to add
- Use `updatePositionNoSave()` during drag, `save()` only on drag end to avoid performance issues
- Maximized widgets cannot be dragged

### Input Method Editor (IME) Handling
When implementing input fields that should respond to Enter key (e.g., todo items):
- Track composition state with `isComposing` ref
- Listen to `@compositionstart` and `@compositionend` events
- Only process Enter key when `!isComposing.value`
- This prevents premature submission during Chinese/Japanese/Korean input

Example:
```vue
<input
  @keydown="(e) => { if (e.key === 'Enter' && !isComposing) handleSubmit() }"
  @compositionstart="isComposing = true"
  @compositionend="isComposing = false"
/>
```

### Persistence
- Primary: Cloudflare KV via `/api/desktop` endpoints (stores all widget data)
- Secondary: Cloudflare R2 via `/api/image` endpoints (stores image files)
- Fallback: localStorage `cloud-desktop-data`
- News cache: localStorage `cloud-desktop-news-cache`
- `save()` method attempts both; `loadFromCloud()` tries API first, falls back to local

### Cloudflare Functions API
Located in `functions/api/`:
- `desktop.ts` - GET/POST/DELETE for widget data in KV namespace `DESKTOP_DATA`
- `image.ts` - POST (upload), GET (retrieve), DELETE for images in R2 bucket `IMAGE_BUCKET`

Both require environment bindings configured in Cloudflare Pages dashboard.

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/desktop.ts` | Central state - all widget operations, persistence, search, tabs, news |
| `src/components/DesktopCanvas.vue` | Canvas, drag logic, widget z-ordering, folder drop detection |
| `src/components/widgets/WidgetWrapper.vue` | Widget container with title bar, controls, delete confirmation |
| `src/components/TabBar.vue` | Left-side tab switcher with hover expansion |
| `src/components/PasswordInput.vue` | 6-digit password entry with auto-focus navigation |
| `src/types/index.ts` | TypeScript interfaces for all widget types and tabs |
| `functions/api/desktop.ts` | Cloudflare KV persistence API |
| `functions/api/image.ts` | Cloudflare R2 image storage API |

## Design System

Hand-drawn/sketch aesthetic using Tailwind CSS:
- Custom classes: `card-hand-drawn`, `folder-widget`, `font-handwritten`, `input-hand-drawn`, `btn-hand-drawn`
- Wobbly borders with irregular border-radius: `255px 15px 225px 15px / 15px 225px 15px 255px`
- Hard offset shadows (no blur): `4px 4px 0px #2d2d2d` (larger), `2px 2px 0px #2d2d2d` (smaller)
- Fonts: Kalam (headings), Patrick Hand (body)
- Colors: Paper (`#fdfbf7`), pencil black (`#2d2d2d`), accent red (`#ff4d4d`), blue pen (`#4d7cff`)
- Toolbar buttons use flex-col layout with icon + small label (10px font)
- Title editing inputs use hand-drawn style with wobbly borders and shadows
- Password inputs use `type="password"` for security (displays asterisks)

Style utilities in `src/style.css`:
- `.wobbly`, `.wobbly-sm`, `.wobbly-lg` - Irregular border radius variants
- `.btn-hand-drawn` - Button with shadow and hover effects
- `.card-hand-drawn` - Card container with border and shadow
- `.input-hand-drawn` - Input field with hand-drawn styling

## Deployment

Deploy to Cloudflare Pages with required bindings:
- KV namespace: `DESKTOP_DATA` (for widget persistence)
- R2 bucket: `IMAGE_BUCKET` (for image storage)
- Environment variable: `VITE_DESKTOP_PASSWORD` (optional, defaults to "000000")

Build command: `npm run build`
Output directory: `dist`
