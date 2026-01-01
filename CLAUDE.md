# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production (runs TypeScript check + Vite build)
npm run preview      # Preview production build
```

## Project Overview

A hand-drawn style online desktop application built with Vue 3 + TypeScript. Users can create, drag, and organize widgets (notes, todos, text blocks, images, markdown) on a grid canvas, manage website bookmarks with categories, and view news feeds. Features a tab-based interface with password protection and cloud sync.

## Architecture

### Component Hierarchy
- `App.vue` - Root component with password protection, tab routing, global keyboard shortcuts, auto-sync timer
  - `PasswordInput.vue` - 6-digit numeric password entry with auto-focus navigation
    - Password configurable via `VITE_DESKTOP_PASSWORD` env var (defaults to "000000")
    - Uses `type="password"` for security (displays asterisks)
    - Auto-focuses next input on digit entry, previous on backspace
    - Shows error message on incorrect password and resets inputs
  - `TabBar.vue` - Left-side hover-expandable tab switcher (desktop/navigation/news)
  - Desktop Tab:
    - `Toolbar.vue` - Top toolbar for adding widgets with icon labels
    - `DesktopCanvas.vue` - Main canvas with drag/drop, grid snapping, paste support
    - `WidgetWrapper.vue` - Container for all widget types with title bar, controls
    - `GlobalSearch.vue` - Keyboard-accessible search modal (Ctrl/Cmd+F)
  - Navigation Tab:
    - `NavigationPage.vue` - Website bookmark manager with drag-to-reorder, categories, right-click context menu
    - `SiteCard.vue` - Individual website card with favicon, name, description
    - `SiteFormDialog.vue` - Add/edit website form with auto-favicon fetching
    - `CategoryManagerDialog.vue` - Manage bookmark categories
  - News Tab:
    - `NewsPage.vue` - News aggregator with source filtering (mock data)
  - Backup Management:
    - `BackupManager.vue` - Backup/restore interface with list view, manual backup, restore with confirmation

### Tab System
- Three tabs: `desktop` (workspace), `navigation` (website bookmarks), and `news` (news feed)
- Tab state persisted to localStorage via `TAB_STORAGE_KEY`
- Global search (Ctrl/Cmd+F) active in both desktop and navigation tabs
- Tab switching via `TabBar.vue` (left-side hover menu)

### Widget System
All widgets extend `BaseWidget` with type-specific properties (defined in `src/types/index.ts`):
- **note** - Sticky notes with 6 color options and one-click copy
- **todo** - Task lists with checkable items, inline editing (double-click), hover backgrounds, IME-aware input
- **text** - Large text content blocks with one-click copy
- **image** - Image display with zoom/scale controls, stored in Cloudflare R2
- **markdown** - Markdown editor with edit/preview toggle, one-click copy, uses `marked` library

Widget features:
- Double-click title to edit (hand-drawn style input with wobbly borders)
- Minimize/maximize/close controls
- Drag to move (grid snapping, 20px)
- Resize handle on bottom-right corner (note, text, markdown, todo widgets only)
- Copy button on note/text/markdown widgets
- Todo items support: hover backgrounds, double-click to edit, IME composition events for Chinese input
- Paste support: Paste images or text anywhere on canvas to create widgets automatically

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
- Tab state (`activeTab`: 'desktop' | 'navigation' | 'news')
- Navigation state (`navigationSites`, `navigationCategories`, `selectedCategory`)
- News state (`newsSources`, `isLoadingNews`, `enabledSources`)
- Sync state (`syncStatus`, `lastSyncTime`, `syncErrorMessage`)
- Persistence to localStorage + optional Cloudflare KV

Key methods:
- `createWidget()` - Factory for all widget types with default sizes
- `updatePositionNoSave()` - Update position without triggering save (use during drag)
- `save()` - Persist to localStorage only (does not sync to cloud)
- `syncToCloud()` - Manual sync to Cloudflare KV (called every 5 minutes and on page unload)
- `syncBeforeUnload()` - Uses sendBeacon API to ensure data is sent before page closes
- `deleteImageWidget()` - Special deletion that also removes from R2
- `updateTodoItem()` - Update todo item text (supports inline editing)
- `setActiveTab()` - Switch between desktop/navigation/news tabs
- `fetchNews()` / `fetchNewsBySource()` - Load news data with caching (mock data)
- `addNavigationSite()` / `updateNavigationSite()` / `deleteNavigationSite()` - Manage navigation bookmarks
- `reorderNavigationSites()` - Update order after drag-and-drop
- `addCategory()` / `deleteCategory()` - Manage bookmark categories

### Drag & Drop System
**Desktop Widgets:**
- Custom mouse event-based drag (not HTML5 drag API) in `DesktopCanvas.vue`
- Grid snapping (20px) during drag
- Uses `requestAnimationFrame` for smooth rendering performance
- Use `updatePositionNoSave()` during drag, `save()` only on drag end to avoid performance issues
- Maximized widgets cannot be dragged

**Navigation Bookmarks:**
- Uses `vuedraggable` library in `NavigationPage.vue`
- Drag to reorder bookmarks within filtered category view
- Visual feedback with ghost and drag classes
- Calls `reorderNavigationSites()` on drag end to persist new order

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
- **Primary**: Cloudflare KV via `/api/desktop` endpoints (stores all widget data + navigation sites + categories)
- **Secondary**: Cloudflare R2 via `/api/image` endpoints (stores image files)
- **Fallback**: localStorage `cloud-desktop-data` (complete data backup)
- **News cache**: localStorage `cloud-desktop-news-cache` (mock news data)
- **Backup**: Automated daily backups to R2 (see BACKUP.md for configuration)
- **Sync strategy**:
  - `save()` writes to localStorage immediately
  - `syncToCloud()` syncs to Cloudflare KV (auto-runs every 5 minutes + on page unload)
  - `init()` loads from cloud first, falls back to localStorage if cloud unavailable
  - `syncBeforeUnload()` uses sendBeacon API for reliable sync on page close
  - **Data protection**: `isCloudInitialized` flag prevents empty data from overwriting cloud data
  - **Server-side protection**: API rejects empty data when cloud has existing data

### Cloudflare Functions API
Located in `functions/api/`:
- `desktop.ts` - GET/POST/DELETE for widget data in KV namespace `DESKTOP_DATA`
- `image.ts` - POST (upload), GET (retrieve), DELETE for images in R2 bucket `IMAGE_BUCKET`
- `restore.ts` - GET (list backups), POST (restore from backup) for data recovery

Located in `functions/scheduled/`:
- `backup.ts` - Automated backup job (triggered by Cron or manual POST request)

Both require environment bindings configured in Cloudflare Pages dashboard.

### Navigation System
The navigation tab provides a visual bookmark manager:
- **Categories**: Default categories (工作, 学习, 其他) + custom categories
- **Auto-favicon**: Automatically fetches website favicons from `{origin}/favicon.ico`
- **Drag-to-reorder**: Uses `vuedraggable` for intuitive reordering within category view
- **Right-click menu**: Context menu for add/edit/delete operations
- **Search support**: Global search (Ctrl/Cmd+F) searches site name, URL, and description
- **Color fallback**: Each site has a preset color used when favicon fails to load
- **Category filtering**: "全部" (All) shows all sites, other categories filter by `site.category`
- **Category management**: Add/delete custom categories (default categories cannot be deleted)
- **Validation**: Cannot delete categories with sites, cannot use reserved name "全部"

Data structure:
- `NavigationSite`: id, name, url, icon, description, color, category, order, timestamps
- Stored in same KV entry as widgets under `navigationSites` and `categories` fields

### Backup & Recovery System
Automated backup system to protect against data loss:

**Data Protection Mechanisms:**
- **Client-side**: `isCloudInitialized` flag prevents syncing before successful cloud load
- **Server-side**: API rejects empty data when cloud has existing data (returns 409 Conflict)
- **Automatic recovery**: On 409 error, client automatically uses server data

**Backup Features:**
- **Manual backup**: Via `BackupManager.vue` UI component
- **Automated backup**: GitHub Actions triggers `/scheduled/backup` daily at 2:00 UTC
- **Backup storage**: R2 bucket with filename format `backup-YYYY-MM-DDTHH-MM-SS.json`
- **Retention policy**: Automatically deletes backups older than 30 days
- **Restore**: Select any backup from list to restore (with confirmation dialog)

**GitHub Actions Setup:**
1. Configure `BACKUP_DOMAIN` secret in repository settings (Settings → Secrets → Actions)
2. Secret value should be domain only (e.g., `your-app.pages.dev`, no `https://`)
3. Workflow runs daily at 2:00 UTC or can be manually triggered
4. Logs available in Actions tab for debugging

**API Endpoints:**
- `GET /api/restore` - List all available backups
- `POST /api/restore` - Restore from specific backup file
- `POST /scheduled/backup` - Create new backup (manual or automated)

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/desktop.ts` | Central state - all widget operations, persistence, search, tabs, news, navigation |
| `src/components/DesktopCanvas.vue` | Canvas, drag logic, widget z-ordering, paste event handling |
| `src/components/widgets/WidgetWrapper.vue` | Widget container with title bar, controls, resize handle |
| `src/components/NavigationPage.vue` | Website bookmark manager with drag-to-reorder and categories |
| `src/components/BackupManager.vue` | Backup/restore UI with list, manual backup, restore confirmation |
| `src/components/TabBar.vue` | Left-side tab switcher with hover expansion |
| `src/components/PasswordInput.vue` | 6-digit password entry with auto-focus navigation |
| `src/components/SyncStatus.vue` | Visual sync status indicator (idle/syncing/success/error) |
| `src/types/index.ts` | TypeScript interfaces for all widget types, tabs, navigation, news |
| `functions/api/desktop.ts` | Cloudflare KV persistence API with empty data protection |
| `functions/api/image.ts` | Cloudflare R2 image storage API |
| `functions/api/restore.ts` | Backup restore API - list and restore from R2 backups |
| `functions/scheduled/backup.ts` | Backup job - saves KV data to R2, cleans old backups (30 days) |
| `.github/workflows/backup.yml` | GitHub Actions daily backup trigger (uses BACKUP_DOMAIN secret) |

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

## Important Development Patterns

### Performance Optimization
- **Drag operations**: Always use `updatePositionNoSave()` during drag, only call `save()` on drag end
- **requestAnimationFrame**: Desktop drag uses RAF loop for smooth 60fps rendering
- **Debounced sync**: Cloud sync happens every 5 minutes, not on every change
- **Lazy loading**: News data cached in localStorage to avoid repeated fetches

### Data Flow
- User action → Store method → `save()` (localStorage) → Auto-sync timer → `syncToCloud()` (KV)
- On init: Try cloud first → Fallback to localStorage → Sync cloud data back to local
- On page close: `syncBeforeUnload()` uses sendBeacon for reliable final sync

### Adding New Features
When adding new widget types, follow the 9-step checklist in the Widget System section.
When adding new tabs, update: `TabType` union, `App.vue` template, `TabBar.vue` icons, store state.

### Common Pitfalls
- Don't forget IME handling for Enter key in input fields (Chinese/Japanese/Korean input)
- Don't call `save()` in tight loops or during drag operations (causes lag)
- Don't modify widget position directly - always use store methods
- Remember to add resize handle only for text-based widgets (note, text, markdown, todo)
- Navigation site order is managed by `order` field, not array index

## Deployment

Deploy to Cloudflare Pages with required bindings:
- KV namespace: `DESKTOP_DATA` (for widget persistence)
- R2 bucket: `IMAGE_BUCKET` (for image storage)
- Environment variable: `VITE_DESKTOP_PASSWORD` (optional, defaults to "000000")

Build command: `npm run build`
Output directory: `dist`
