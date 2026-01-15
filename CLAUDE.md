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
    - `NewsPage.vue` - News aggregator with source filtering (real-time data from multiple sources)
  - Resource Search Tab:
    - `ResourceSearchPage.vue` - Placeholder for future resource search feature
  - File Tab:
    - `FilePage.vue` - File manager with grid/list view, folder navigation, drag-to-reorder
    - `FilePreviewDialog.vue` - Preview dialog for images, PDFs, Office documents (Word, Excel)
    - Supports file upload (single/batch), folder upload, download, delete, copy/cut/paste
    - File metadata stored in KV, actual files stored in R2 (20MB size limit per file)
  - Mind Map Tab:
    - `MindMapPage.vue` - Mind mapping editor using `simple-mind-map` library
    - `MindMapHistory.vue` - History panel showing recent mind maps
    - Features: create/open/save/export, undo/redo, zoom, node operations (add/delete/copy/paste)
    - Mind map data stored as files in R2, metadata tracked in KV
  - Backup Management:
    - `BackupManager.vue` - Backup/restore interface with list view, manual backup, restore with confirmation

### Tab System
- Six tabs:
  - `desktop` - Main workspace with draggable widgets
  - `navigation` - Website bookmark manager with categories
  - `news` - News aggregator with multiple sources
  - `resource-search` - Resource search (placeholder, not yet implemented)
  - `file` - File management system with upload/download/preview
  - `mindmap` - Mind mapping tool using `simple-mind-map` library
- Tab state persisted to localStorage via `TAB_STORAGE_KEY`
- Global search (Ctrl/Cmd+F) active in desktop and navigation tabs
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
- Tab state (`activeTab`: 'desktop' | 'navigation' | 'news' | 'resource-search' | 'file' | 'mindmap')
- Navigation state (`navigationSites`, `navigationCategories`, `selectedCategory`)
- News state (`newsSources`, `isLoadingNews`, `enabledSources`)
- File state (`files`, `folders`, `currentFolderId`, `fileViewMode`, `clipboard`, `selectedFileIds`)
- Mind map state (`mindMapHistory`, `currentMindMapId`, `isLoadingMindMap`)
- Sync state (`syncStatus`, `lastSyncTime`, `syncErrorMessage`, `isCloudInitialized`)
- File sync state (`fileSyncStatus`, `lastFileSyncTime`, `isFileCloudInitialized`)
- Persistence to localStorage + Cloudflare KV + R2

Key methods:
- `createWidget()` - Factory for all widget types with default sizes
- `updatePositionNoSave()` - Update position without triggering save (use during drag)
- `save()` - Persist to localStorage only (does not sync to cloud)
- `syncToCloud()` - Manual sync to Cloudflare KV (called every 5 minutes and on page unload)
- `syncBeforeUnload()` - Uses sendBeacon API to ensure data is sent before page closes
- `deleteImageWidget()` - Special deletion that also removes from R2
- `updateTodoItem()` - Update todo item text (supports inline editing)
- `setActiveTab()` - Switch between desktop/navigation/news/resource-search/file/mindmap tabs
- `fetchNews()` / `fetchNewsBySource()` - Load news data with caching
- `addNavigationSite()` / `updateNavigationSite()` / `deleteNavigationSite()` - Manage navigation bookmarks
- `reorderNavigationSites()` - Update order after drag-and-drop
- `addCategory()` / `deleteCategory()` - Manage bookmark categories
- File operations:
  - `uploadFile()` / `uploadFolder()` - Upload files/folders to R2 with progress tracking
  - `downloadFile()` / `deleteFile()` / `deleteFolder()` - File management operations
  - `createFolder()` / `renameFile()` / `renameFolder()` - Folder and file operations
  - `copyItems()` / `cutItems()` / `pasteItems()` - Clipboard operations
  - `syncFilesToCloud()` / `syncFilesBeforeUnload()` - File metadata sync to KV
- Mind map operations:
  - `createMindMap()` / `openMindMap()` / `saveMindMap()` - Mind map file management
  - `deleteMindMap()` / `updateMindMapHistory()` - History management

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
- **Primary**: Cloudflare KV via `/api/desktop` endpoints (stores all widget data + navigation sites + categories + mind map history)
- **Secondary**: Cloudflare R2 via `/api/image` and `/api/file` endpoints (stores image files, uploaded files, mind map data files)
- **Fallback**: localStorage `cloud-desktop-data` (complete data backup)
- **File metadata**: Separate KV key `file-metadata` for file system structure
- **News cache**: D1 database via `/api/news` endpoints (real-time news data with caching)
- **Backup**: Automated daily backups to R2 (see Backup & Recovery System section)
- **Sync strategy**:
  - `save()` writes to localStorage immediately
  - `syncToCloud()` syncs desktop data to Cloudflare KV (auto-runs every 5 minutes + on page unload)
  - `syncFilesToCloud()` syncs file metadata to KV (separate from desktop data)
  - `init()` loads from cloud first, falls back to localStorage if cloud unavailable
  - `initFiles()` loads file metadata from cloud
  - `syncBeforeUnload()` / `syncFilesBeforeUnload()` use sendBeacon API for reliable sync on page close
  - **Data protection**: `isCloudInitialized` and `isFileCloudInitialized` flags prevent empty data from overwriting cloud data
  - **Server-side protection**: API rejects empty data when cloud has existing data

### Cloudflare Functions API
Located in `functions/api/`:
- `desktop.ts` - GET/POST/DELETE for widget data in KV namespace `DESKTOP_DATA`
- `image.ts` - POST (upload), GET (retrieve), DELETE for images in R2 bucket `IMAGE_BUCKET`
- `file.ts` - POST (upload), GET (retrieve), DELETE for files in R2 bucket `IMAGE_BUCKET` (20MB limit)
- `file-metadata.ts` - GET/POST for file system metadata in KV namespace `DESKTOP_DATA`
- `news.ts` - GET for real-time news data with D1 database caching
- `init-news-cache.ts` - POST to initialize D1 news cache database
- `restore.ts` - GET (list backups), POST (restore from backup) for data recovery

Located in `functions/scheduled/`:
- `backup.ts` - Automated backup job (triggered by Cron or manual POST request)

Located in `functions/news/`:
- `sources/` - Individual news source scrapers (baidu, github, zhihu, douyin, etc.)
- `registry.ts` - News source registry and management
- `utils.ts` - Shared utilities for news fetching

All require environment bindings configured in Cloudflare Pages dashboard.

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

### File Management System
The file tab provides a full-featured file manager:
- **Storage**: File metadata in KV (`file-metadata` key), actual files in R2 bucket (20MB limit per file)
- **Folder structure**: Hierarchical folder system with `parentId` references
- **View modes**: Grid view (default) or list view toggle
- **Upload**: Single file, batch files, or entire folder upload with progress tracking
- **Preview**: Built-in preview for images, PDFs, Word (.docx), Excel (.xlsx) files
- **Operations**: Download, delete, rename, copy/cut/paste, drag-to-reorder
- **Sorting**: Sort by name, size, or date (ascending/descending)
- **Multi-select**: Shift+click for range selection, Ctrl/Cmd+click for individual selection
- **Clipboard**: Copy/cut files and folders, paste into different folders
- **Sync**: Separate sync status for file metadata (`fileSyncStatus`, `isFileCloudInitialized`)

Data structures:
- `FileItem`: id, name, type='file', size, mimeType, url (R2 key), parentId, order, timestamps
- `FolderItem`: id, name, type='folder', parentId, order, timestamps, isExpanded
- Stored in KV under `file-metadata` key as `FileData` object

### Mind Map System
The mind map tab provides a visual mind mapping tool:
- **Library**: Uses `simple-mind-map` library with plugins (Drag, Select, Export, KeyboardNavigation)
- **Storage**: Mind map data stored as JSON files in R2, metadata tracked in KV
- **Features**:
  - Create new mind maps with custom names
  - Open recent mind maps from history panel
  - Auto-save on changes (debounced)
  - Export to PNG/SVG/JSON/PDF formats
  - Undo/redo support
  - Zoom in/out/fit controls
  - Node operations: add child/sibling, delete, copy/cut/paste
- **History**: Recent mind maps tracked with `lastOpened` timestamp
- **File integration**: Mind maps stored as files in file system, referenced by `fileId`

Data structures:
- `MindMapFile`: id, name, fileId (reference to FileItem), thumbnail (optional), lastOpened, timestamps
- `SimpleMindMapNode`: data (text, uid, expand, image, icon, tag, hyperlink, note), children
- `MindMapData`: root (SimpleMindMapNode), theme, layout
- Stored in KV under `mindMapHistory` field in main desktop data

### News Aggregation System
The news tab provides real-time news from multiple sources:
- **Sources**: 18+ news sources including GitHub, Baidu, Zhihu, Douyin, Hupu, IT Home, Juejin, etc.
- **Architecture**: Each source has a dedicated scraper in `functions/news/sources/`
- **Caching**: News data cached in D1 database to reduce API calls and improve performance
- **Registry**: Centralized source registry in `functions/news/registry.ts` for easy management
- **Filtering**: Users can enable/disable specific news sources
- **Real-time**: News fetched on-demand with automatic cache invalidation
- **Error handling**: Individual source failures don't affect other sources

News source structure:
- Each source exports `fetchNews()` function returning `NewsItem[]`
- `NewsItem`: id, title, url, extra (hover description, info like star count)
- Sources registered in `NEWS_SOURCES` array in registry
- Cache key format: `news:{sourceId}` with TTL in D1

Adding new news sources:
1. Create scraper in `functions/news/sources/{source-name}.ts`
2. Implement `fetchNews()` function following existing patterns
3. Register in `functions/news/registry.ts` `NEWS_SOURCES` array
4. Add source ID to default `enabledSources` in store (optional)

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
| `src/components/NewsPage.vue` | News aggregator with real-time data from multiple sources |
| `src/components/ResourceSearchPage.vue` | Resource search page (placeholder, not yet implemented) |
| `src/components/FilePage.vue` | File manager with upload/download/preview, grid/list view |
| `src/components/FilePreviewDialog.vue` | File preview dialog for images, PDFs, Office documents |
| `src/components/MindMapPage.vue` | Mind mapping editor using simple-mind-map library |
| `src/components/mindmap/MindMapHistory.vue` | Mind map history panel with recent files |
| `src/components/BackupManager.vue` | Backup/restore UI with list, manual backup, restore confirmation |
| `src/components/TabBar.vue` | Left-side tab switcher with hover expansion |
| `src/components/PasswordInput.vue` | 6-digit password entry with auto-focus navigation |
| `src/components/SyncStatus.vue` | Visual sync status indicator (idle/syncing/success/error) |
| `src/types/index.ts` | TypeScript interfaces for all widget types, tabs, navigation, news, files, mind maps |
| `src/utils/fileIcons.ts` | File icon mapping utilities for different file types |
| `functions/api/desktop.ts` | Cloudflare KV persistence API with empty data protection |
| `functions/api/image.ts` | Cloudflare R2 image storage API |
| `functions/api/file.ts` | Cloudflare R2 file storage API (20MB limit per file) |
| `functions/api/file-metadata.ts` | Cloudflare KV file metadata persistence API |
| `functions/api/news.ts` | News aggregation API with D1 database caching |
| `functions/api/restore.ts` | Backup restore API - list and restore from R2 backups |
| `functions/scheduled/backup.ts` | Backup job - saves KV data to R2, cleans old backups (30 days) |
| `functions/news/registry.ts` | News source registry and management |
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
When adding new news sources, create scraper in `functions/news/sources/`, register in `functions/news/registry.ts`.

### Common Pitfalls
- Don't forget IME handling for Enter key in input fields (Chinese/Japanese/Korean input)
- Don't call `save()` in tight loops or during drag operations (causes lag)
- Don't modify widget position directly - always use store methods
- Remember to add resize handle only for text-based widgets (note, text, markdown, todo)
- Navigation site order is managed by `order` field, not array index
- File uploads have 20MB size limit per file - validate before upload
- Mind map instance uses `shallowRef` to preserve the instance - don't use regular `ref`
- Separate sync for desktop data (`syncToCloud`) and file metadata (`syncFilesToCloud`)

## Deployment

Deploy to Cloudflare Pages with required bindings:
- **KV namespace**: `DESKTOP_DATA` (for widget persistence and file metadata)
- **R2 bucket**: `IMAGE_BUCKET` (for image storage, file storage, mind map data, backups)
- **D1 database**: `NEWS_CACHE_DB` (for news data caching)
- **Environment variable**: `VITE_DESKTOP_PASSWORD` (optional, defaults to "000000")

Build command: `npm run build`
Output directory: `dist`

### D1 Database Setup
Initialize the news cache database with this schema:
```sql
CREATE TABLE IF NOT EXISTS news_cache (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
)
```
