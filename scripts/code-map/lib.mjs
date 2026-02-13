import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

const SCAN_ROOTS = ['src', 'server', 'functions']
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.tmp-codex-home',
  'server/storage',
  'server/data',
])

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue'])

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function shouldSkipDir(dir) {
  const normalized = normalizePath(dir)
  return IGNORE_DIRS.has(normalized)
}

async function walk(dir, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const normalized = normalizePath(fullPath)

    if (entry.isDirectory()) {
      if (shouldSkipDir(normalized)) {
        continue
      }
      await walk(fullPath, result)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const ext = path.extname(entry.name)
    if (!CODE_EXTENSIONS.has(ext)) {
      continue
    }

    result.push(normalized)
  }

  return result
}

function getGitCommit() {
  return null
}

function moduleFromPath(filePath) {
  if (filePath.startsWith('src/components/widgets/')) return 'frontend/widgets'
  if (filePath.startsWith('src/components/navigation/')) return 'frontend/navigation'
  if (filePath.startsWith('src/components/mindmap/')) return 'frontend/mindmap'
  if (filePath.startsWith('src/components/')) return 'frontend/components'
  if (filePath.startsWith('src/stores/')) return 'frontend/state'
  if (filePath.startsWith('src/utils/')) return 'frontend/utils'
  if (filePath.startsWith('src/types/')) return 'frontend/types'
  if (filePath.startsWith('src/')) return 'frontend/core'

  if (filePath.startsWith('server/routes/')) return 'backend/routes'
  if (filePath.startsWith('server/news/')) return 'backend/news'
  if (filePath.startsWith('server/storage/')) return 'backend/storage'
  if (filePath.startsWith('server/')) return 'backend/core'

  if (filePath.startsWith('functions/news/sources/')) return 'edge/news-sources'
  if (filePath.startsWith('functions/news/')) return 'edge/news'
  if (filePath.startsWith('functions/api/')) return 'edge/api'
  if (filePath.startsWith('functions/scheduled/')) return 'edge/scheduled'
  if (filePath.startsWith('functions/types/')) return 'edge/types'
  if (filePath.startsWith('functions/')) return 'edge/core'

  return 'misc'
}

function basenameFeature(filePath) {
  const base = path.basename(filePath).replace(path.extname(filePath), '')
  return base.replace(/[-_]/g, ' ')
}

function extractRoutes(content) {
  const routeMatches = []
  const routeRegex = /\b(router|app)\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g
  let match
  while ((match = routeRegex.exec(content)) !== null) {
    routeMatches.push(`${match[2].toUpperCase()} ${match[3]}`)
  }
  return Array.from(new Set(routeMatches)).sort()
}

function extractExports(content) {
  const names = new Set()
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
    /export\s+const\s+([A-Za-z0-9_]+)/g,
    /export\s+default\s+([A-Za-z0-9_]+)/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      names.add(match[1])
    }
  }

  if (/export\s+default\s*\{/.test(content)) {
    names.add('default object export')
  }

  return Array.from(names).sort()
}

function extractVueSignals(content) {
  const signals = []
  if (/onMounted\s*\(/.test(content)) signals.push('mount lifecycle')
  if (/watch\s*\(/.test(content)) signals.push('reactive watcher')
  if (/computed\s*\(/.test(content)) signals.push('computed state')
  if (/useDesktopStore\s*\(/.test(content)) signals.push('desktop store integration')
  return signals
}

function inferFeaturePoints(filePath, content) {
  const points = []
  const routePoints = extractRoutes(content)
  const exportPoints = extractExports(content)
  const vueSignals = filePath.endsWith('.vue') ? extractVueSignals(content) : []

  if (routePoints.length > 0) {
    points.push(...routePoints.map((r) => `endpoint: ${r}`))
  }

  if (exportPoints.length > 0) {
    points.push(...exportPoints.map((e) => `export: ${e}`))
  }

  if (filePath.startsWith('functions/news/sources/')) {
    points.push('news source fetcher')
  }

  if (filePath.startsWith('functions/scheduled/')) {
    points.push('scheduled task entry')
  }

  if (filePath.endsWith('.vue')) {
    points.push(...vueSignals)
  }

  if (points.length === 0) {
    points.push(`feature: ${basenameFeature(filePath)}`)
  }

  return Array.from(new Set(points)).sort()
}

function fileTypeFromPath(filePath) {
  if (filePath.endsWith('.vue')) return 'vue-component'
  if (filePath.startsWith('server/routes/')) return 'express-route'
  if (filePath.startsWith('functions/api/')) return 'edge-handler'
  if (filePath.startsWith('functions/scheduled/')) return 'scheduled-handler'
  if (filePath.startsWith('functions/news/sources/')) return 'news-source'
  if (filePath.includes('/stores/')) return 'state-store'
  return 'code-file'
}

export async function buildIndexData() {
  const files = []
  for (const scanRoot of SCAN_ROOTS) {
    try {
      const stats = await fs.stat(scanRoot)
      if (!stats.isDirectory()) continue
      const listed = await walk(scanRoot)
      files.push(...listed)
    } catch {
      // Root folder does not exist in this project.
    }
  }

  files.sort()
  let latestMtimeMs = 0

  const modules = {}
  for (const filePath of files) {
    const absolutePath = path.join(ROOT, filePath)
    const [content, stats] = await Promise.all([
      fs.readFile(absolutePath, 'utf8'),
      fs.stat(absolutePath),
    ])
    latestMtimeMs = Math.max(latestMtimeMs, stats.mtimeMs)
    const moduleName = moduleFromPath(filePath)

    if (!modules[moduleName]) {
      modules[moduleName] = []
    }

    modules[moduleName].push({
      file: filePath,
      type: fileTypeFromPath(filePath),
      featurePoints: inferFeaturePoints(filePath, content),
    })
  }

  for (const moduleName of Object.keys(modules)) {
    modules[moduleName].sort((a, b) => a.file.localeCompare(b.file))
  }

  const moduleNames = Object.keys(modules).sort()

  return {
    generatedAt: new Date(latestMtimeMs || Date.now()).toISOString(),
    gitCommit: getGitCommit(),
    stats: {
      totalModules: moduleNames.length,
      totalFiles: files.length,
    },
    modules: moduleNames.map((name) => ({
      name,
      files: modules[name],
    })),
  }
}

export function renderMarkdown(index) {
  const lines = []

  lines.push('# Code Map')
  lines.push('')
  lines.push(`- Generated at: ${index.generatedAt}`)
  lines.push(`- Git commit: ${index.gitCommit ?? 'unknown'}`)
  lines.push(`- Modules: ${index.stats.totalModules}`)
  lines.push(`- Files: ${index.stats.totalFiles}`)
  lines.push('')
  lines.push('This file is generated. Run `npm run code-map:build` after feature/module changes.')
  lines.push('')

  for (const module of index.modules) {
    lines.push(`## ${module.name}`)
    lines.push('')

    for (const file of module.files) {
      lines.push(`- ${file.file}`)
      lines.push(`  - Type: ${file.type}`)
      lines.push(`  - Feature points: ${file.featurePoints.join('; ')}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

export async function writeIndexFiles(index, outputDir = 'docs/code-map') {
  await fs.mkdir(outputDir, { recursive: true })
  const jsonPath = path.join(outputDir, 'index.json')
  const mdPath = path.join(outputDir, 'index.md')

  await fs.writeFile(jsonPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  await fs.writeFile(mdPath, `${renderMarkdown(index)}\n`, 'utf8')

  return { jsonPath, mdPath }
}
