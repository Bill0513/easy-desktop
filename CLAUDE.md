# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production (runs TypeScript check + Vite build)
npm run preview      # Preview production build
```

## Project Overview

A hand-drawn style online desktop application built with Vue 3 + TypeScript. Users can create, drag, and organize widgets (notes, todos, bookmarks, text blocks, folders, images, markdown) on a grid canvas.

## Architecture

### Component Hierarchy
- `App.vue` → `DesktopCanvas.vue` → `WidgetWrapper.vue` → Individual widget components
- `Toolbar.vue` - Fixed top toolbar for adding widgets with icon labels
- `Taskbar.vue` - Bottom taskbar showing minimized widgets grouped by type
- `GlobalSearch.vue` - Keyboard-accessible search modal (Cmd/Ctrl+K)

### Widget System
All widgets extend `BaseWidget` with type-specific properties (defined in `src/types/index.ts`):
- **note** - Sticky notes with background color and content
- **todo** - Task lists with checkable items
- **bookmark** - URL bookmarks collection
- **folder** - Container that holds references to other widgets via `children: string[]`
- **text** - Large text content blocks
- **image** - Image display with zoom/scale controls, stored in Cloudflare R2
- **markdown** - Markdown editor with edit/preview toggle using `marked` library

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
- Persistence to localStorage + optional Cloudflare KV

Key methods:
- `createWidget()` - Factory for all widget types with default sizes
- `updatePositionNoSave()` - Update position without triggering save (use during drag)
- `save()` - Persist to both localStorage and cloud
- `deleteImageWidget()` - Special deletion that also removes from R2

### Drag & Drop System
- Custom mouse event-based drag (not HTML5 drag API) in `DesktopCanvas.vue`
- Grid snapping (20px) during drag
- Folder detection on drag end - component center must be within folder bounds to add
- Use `updatePositionNoSave()` during drag, `save()` only on drag end to avoid performance issues
- Maximized widgets cannot be dragged

### Persistence
- Primary: Cloudflare KV via `/api/desktop` endpoints (stores all widget data)
- Secondary: Cloudflare R2 via `/api/image` endpoints (stores image files)
- Fallback: localStorage `cloud-desktop-data`
- `save()` method attempts both; `loadFromCloud()` tries API first, falls back to local

### Cloudflare Functions API
Located in `functions/api/`:
- `desktop.ts` - GET/POST/DELETE for widget data in KV namespace `DESKTOP_DATA`
- `image.ts` - POST (upload), GET (retrieve), DELETE for images in R2 bucket `IMAGE_BUCKET`

Both require environment bindings configured in Cloudflare Pages dashboard.

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/desktop.ts` | Central state - all widget operations, persistence, search |
| `src/components/DesktopCanvas.vue` | Canvas, drag logic, widget z-ordering, folder drop detection |
| `src/components/widgets/WidgetWrapper.vue` | Widget container with title bar, controls, delete confirmation |
| `src/types/index.ts` | TypeScript interfaces for all widget types |
| `functions/api/desktop.ts` | Cloudflare KV persistence API |
| `functions/api/image.ts` | Cloudflare R2 image storage API |

## Design System

Hand-drawn/sketch aesthetic using Tailwind CSS:
- Custom classes: `card-hand-drawn`, `folder-widget`, `font-handwritten`
- Wobbly borders with irregular border-radius
- Hard offset shadows (no blur): `4px 4px 0px #2d2d2d`
- Fonts: Kalam (headings), Patrick Hand (body)
- Colors: Paper (`#fdfbf7`), pencil black (`#2d2d2d`), accent red (`#ff4d4d`)
- Toolbar buttons use flex-col layout with icon + small label (10px font)

## Deployment

Deploy to Cloudflare Pages with required bindings:
- KV namespace: `DESKTOP_DATA` (for widget persistence)
- R2 bucket: `IMAGE_BUCKET` (for image storage)

Build command: `npm run build`
Output directory: `dist`
