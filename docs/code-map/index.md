# Code Map

- Generated at: 2026-02-13T07:26:21.787Z
- Git commit: unknown
- Modules: 16
- Files: 94

This file is generated. Run `npm run code-map:build` after feature/module changes.

## backend/core

- server/db.js
  - Type: code-file
  - Feature points: export: backupStore; export: db; export: initDatabase; export: kvStore; export: newsCache
- server/index.js
  - Type: code-file
  - Feature points: endpoint: GET /health; endpoint: USE /api/desktop; endpoint: USE /api/file; endpoint: USE /api/file-metadata; endpoint: USE /api/image; endpoint: USE /api/news; endpoint: USE /api/restore; endpoint: USE /scheduled/backup

## backend/news

- server/news/index.js
  - Type: code-file
  - Feature points: export: fetchAllNews; export: getNewsSources

## backend/routes

- server/routes/backup.js
  - Type: express-route
  - Feature points: endpoint: POST /; export: router
- server/routes/desktop.js
  - Type: express-route
  - Feature points: endpoint: DELETE /; endpoint: GET /; endpoint: POST /; export: router
- server/routes/file-metadata.js
  - Type: express-route
  - Feature points: endpoint: GET /; endpoint: POST /; export: router
- server/routes/file.js
  - Type: express-route
  - Feature points: endpoint: DELETE /:filename; endpoint: GET /:filename; endpoint: POST /; export: router
- server/routes/image.js
  - Type: express-route
  - Feature points: endpoint: DELETE /:filename; endpoint: GET /:filename; endpoint: POST /; export: router
- server/routes/news.js
  - Type: express-route
  - Feature points: endpoint: GET /; endpoint: POST /init-cache; export: router
- server/routes/restore.js
  - Type: express-route
  - Feature points: endpoint: GET /; endpoint: POST /; export: router

## edge/api

- functions/api/desktop.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/file-metadata.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/file.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/image.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/init-news-cache.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/news.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/restore.ts
  - Type: edge-handler
  - Feature points: export: onRequest
- functions/api/transform-navigation.ts
  - Type: edge-handler
  - Feature points: export: onRequestPost

## edge/news

- functions/news/registry.ts
  - Type: code-file
  - Feature points: export: getAllSources; export: getSource; export: newsSources
- functions/news/types.ts
  - Type: code-file
  - Feature points: feature: types
- functions/news/utils.ts
  - Type: code-file
  - Feature points: export: myFetch

## edge/news-sources

- functions/news/sources/36kr.ts
  - Type: news-source
  - Feature points: export: fetch36krNews; news source fetcher
- functions/news/sources/baidu.ts
  - Type: news-source
  - Feature points: export: fetchBaiduNews; news source fetcher
- functions/news/sources/chongbuluo.ts
  - Type: news-source
  - Feature points: export: fetchChongbuluoNews; news source fetcher
- functions/news/sources/coolapk.ts
  - Type: news-source
  - Feature points: export: fetchCoolapkNews; news source fetcher
- functions/news/sources/douyin.ts
  - Type: news-source
  - Feature points: export: fetchDouyinNews; news source fetcher
- functions/news/sources/fastbull.ts
  - Type: news-source
  - Feature points: export: fetchFastbullNews; news source fetcher
- functions/news/sources/gelonghui.ts
  - Type: news-source
  - Feature points: export: fetchGelonghuiNews; news source fetcher
- functions/news/sources/github.ts
  - Type: news-source
  - Feature points: export: fetchGithubNews; news source fetcher
- functions/news/sources/hupu.ts
  - Type: news-source
  - Feature points: export: fetchHupuNews; news source fetcher
- functions/news/sources/ithome.ts
  - Type: news-source
  - Feature points: export: fetchIthomeNews; news source fetcher
- functions/news/sources/jin10.ts
  - Type: news-source
  - Feature points: export: fetchJin10News; news source fetcher
- functions/news/sources/juejin.ts
  - Type: news-source
  - Feature points: export: fetchJuejinNews; news source fetcher
- functions/news/sources/mktnews.ts
  - Type: news-source
  - Feature points: export: fetchMktnewsNews; news source fetcher
- functions/news/sources/solidot.ts
  - Type: news-source
  - Feature points: export: fetchSolidotNews; news source fetcher
- functions/news/sources/sputniknewscn.ts
  - Type: news-source
  - Feature points: export: fetchSputniknewscnNews; news source fetcher
- functions/news/sources/sspai.ts
  - Type: news-source
  - Feature points: export: fetchSspaiNews; news source fetcher
- functions/news/sources/tencent.ts
  - Type: news-source
  - Feature points: export: fetchTencentNews; news source fetcher
- functions/news/sources/thepaper.ts
  - Type: news-source
  - Feature points: export: fetchThepaperNews; news source fetcher
- functions/news/sources/tieba.ts
  - Type: news-source
  - Feature points: export: fetchTiebaNews; news source fetcher
- functions/news/sources/toutiao.ts
  - Type: news-source
  - Feature points: export: fetchToutiaoNews; news source fetcher
- functions/news/sources/wallstreetcn.ts
  - Type: news-source
  - Feature points: export: fetchWallstreetcnNews; news source fetcher
- functions/news/sources/xueqiu.ts
  - Type: news-source
  - Feature points: export: fetchXueqiuNews; news source fetcher
- functions/news/sources/zaobao.ts
  - Type: news-source
  - Feature points: export: fetchZaobaoNews; news source fetcher
- functions/news/sources/zhihu.ts
  - Type: news-source
  - Feature points: export: fetchZhihuNews; news source fetcher

## edge/scheduled

- functions/scheduled/backup.ts
  - Type: scheduled-handler
  - Feature points: export: onRequest; scheduled task entry

## edge/types

- functions/types/cloudflare.d.ts
  - Type: code-file
  - Feature points: feature: cloudflare.d

## frontend/components

- src/components/BackupManager.vue
  - Type: vue-component
  - Feature points: mount lifecycle
- src/components/BottomTabBar.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/CustomSelect.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle
- src/components/DesktopCanvas.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle
- src/components/FilePage.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle
- src/components/FilePreviewDialog.vue
  - Type: vue-component
  - Feature points: computed state; reactive watcher
- src/components/GlobalSearch.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle; reactive watcher
- src/components/HandDrawnDialog.vue
  - Type: vue-component
  - Feature points: reactive watcher
- src/components/MindMapPage.vue
  - Type: vue-component
  - Feature points: desktop store integration; mount lifecycle; reactive watcher
- src/components/MobileDesktopPage.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle; reactive watcher
- src/components/MobileQuickAddFab.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/NavigationPage.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/NewsCard.vue
  - Type: vue-component
  - Feature points: desktop store integration
- src/components/NewsPage.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle
- src/components/PasswordInput.vue
  - Type: vue-component
  - Feature points: mount lifecycle
- src/components/SearchBar.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle; reactive watcher
- src/components/SettingsDialog.vue
  - Type: vue-component
  - Feature points: desktop store integration
- src/components/SyncStatus.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle; reactive watcher
- src/components/TabBar.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/Taskbar.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/Toast.vue
  - Type: vue-component
  - Feature points: mount lifecycle
- src/components/ToastContainer.vue
  - Type: vue-component
  - Feature points: feature: ToastContainer
- src/components/Toolbar.vue
  - Type: vue-component
  - Feature points: desktop store integration

## frontend/core

- src/App.vue
  - Type: vue-component
  - Feature points: desktop store integration; mount lifecycle
- src/composables/useResponsiveMode.ts
  - Type: code-file
  - Feature points: export: useResponsiveMode
- src/env.d.ts
  - Type: code-file
  - Feature points: export: Drag; export: Export; export: KeyboardNavigation; export: Select; export: component
- src/main.ts
  - Type: code-file
  - Feature points: feature: main

## frontend/mindmap

- src/components/mindmap/MindMapHistory.vue
  - Type: vue-component
  - Feature points: feature: MindMapHistory

## frontend/navigation

- src/components/navigation/CategoryManagerDialog.vue
  - Type: vue-component
  - Feature points: desktop store integration
- src/components/navigation/SiteCard.vue
  - Type: vue-component
  - Feature points: computed state
- src/components/navigation/SiteFormDialog.vue
  - Type: vue-component
  - Feature points: desktop store integration; reactive watcher

## frontend/state

- src/stores/desktop.ts
  - Type: state-store
  - Feature points: export: useDesktopStore

## frontend/types

- src/types/editorjs.d.ts
  - Type: code-file
  - Feature points: export: class
- src/types/index.ts
  - Type: code-file
  - Feature points: feature: index

## frontend/utils

- src/utils/fileIcons.ts
  - Type: code-file
  - Feature points: export: getFileExtension; export: getFileIcon
- src/utils/indexedDB.ts
  - Type: code-file
  - Feature points: export: indexedDB

## frontend/widgets

- src/components/widgets/CheckInWidget.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/widgets/CountdownWidget.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle
- src/components/widgets/ImageWidget.vue
  - Type: vue-component
  - Feature points: computed state
- src/components/widgets/MarkdownWidget.vue
  - Type: vue-component
  - Feature points: desktop store integration; mount lifecycle; reactive watcher
- src/components/widgets/MarkdownWidgetNotion.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; reactive watcher
- src/components/widgets/MarkdownWidgetTiptap.vue
  - Type: vue-component
  - Feature points: desktop store integration; reactive watcher
- src/components/widgets/NoteWidget.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; reactive watcher
- src/components/widgets/RandomPickerWidget.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration; mount lifecycle; reactive watcher
- src/components/widgets/TextWidget.vue
  - Type: vue-component
  - Feature points: desktop store integration; reactive watcher
- src/components/widgets/TodoWidget.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration
- src/components/widgets/WidgetWrapper.vue
  - Type: vue-component
  - Feature points: computed state; desktop store integration

