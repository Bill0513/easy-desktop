# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production (runs TypeScript check + Vite build)
npm run preview      # Preview production build
```

## Project Overview

A hand-drawn style online desktop application built with Vue 3 + TypeScript. Users can create, drag, and organize widgets (notes, todos, bookmarks, text blocks, folders) on a grid canvas.

## Architecture

### Component Hierarchy
- `App.vue` → `DesktopCanvas.vue` → `WidgetWrapper.vue` → Individual widget components
- `Toolbar.vue` - Fixed top toolbar for adding widgets
- `Taskbar.vue` - Bottom taskbar showing minimized widgets grouped by type

### Widget System
All widgets extend `BaseWidget` with type-specific properties (defined in `src/types/index.ts`):
- **note** - Sticky notes with background color and content
- **todo** - Task lists with checkable items
- **bookmark** - URL bookmarks collection
- **folder** - Container that holds references to other widgets via `children: string[]`
- **text** - Large text content blocks

### State Management (`src/stores/desktop.ts`)
Single Pinia store managing:
- All widgets array with position (x, y), size, z-index, minimize/maximize state
- Selection and drag state
- Persistence to localStorage + optional Cloudflare KV

### Drag & Drop System
- Custom mouse event-based drag (not HTML5 drag API) in `DesktopCanvas.vue`
- Grid snapping (20px) during drag
- Folder detection on drag end - component center must be within folder bounds to add
- Use `updatePositionNoSave()` during drag, `save()` only on drag end to avoid performance issues

### Persistence
- Primary: Cloudflare KV via `/api/desktop` endpoints
- Fallback: localStorage `cloud-desktop-data`
- `save()` method attempts both; `loadFromCloud()` tries API first, falls back to local

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/desktop.ts` | Central state - all widget operations, persistence |
| `src/components/DesktopCanvas.vue` | Canvas, drag logic, widget z-ordering |
| `src/components/widgets/WidgetWrapper.vue` | Widget container with title bar, controls |
| `src/types/index.ts` | TypeScript interfaces for all widget types |

## Design System

Hand-drawn/sketch aesthetic using Tailwind CSS:
- Custom classes: `card-hand-drawn`, `folder-widget`, `font-handwritten`
- Wobbly borders with irregular border-radius
- Hard offset shadows (no blur): `4px 4px 0px #2d2d2d`
- Fonts: Kalam (headings), Patrick Hand (body)
- Colors: Paper (`#fdfbf7`), pencil black (`#2d2d2d`), accent red (`#ff4d4d`)
