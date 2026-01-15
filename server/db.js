import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_PATH = join(__dirname, 'data', 'local.db')

// 确保数据目录存在
if (!existsSync(dirname(DB_PATH))) {
  mkdirSync(dirname(DB_PATH), { recursive: true })
}

// 创建数据库连接
export const db = new Database(DB_PATH)

// 初始化数据库表
export function initDatabase() {
  // KV 存储表（模拟 Cloudflare KV）
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // 新闻缓存表（模拟 D1 数据库）
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_cache (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated INTEGER NOT NULL
    )
  `)

  // 备份表
  db.exec(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `)

  console.log('✅ Database initialized')
}

// KV 操作方法
export const kvStore = {
  get: (key) => {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key)
    return row ? row.value : null
  },

  put: (key, value) => {
    const stmt = db.prepare(`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)
    stmt.run(key, value, Date.now())
  },

  delete: (key) => {
    db.prepare('DELETE FROM kv_store WHERE key = ?').run(key)
  },

  list: () => {
    return db.prepare('SELECT key FROM kv_store').all()
  }
}

// 新闻缓存操作
export const newsCache = {
  get: (id) => {
    const row = db.prepare('SELECT data, updated FROM news_cache WHERE id = ?').get(id)
    return row
  },

  put: (id, data) => {
    const stmt = db.prepare(`
      INSERT INTO news_cache (id, data, updated)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated = excluded.updated
    `)
    stmt.run(id, JSON.stringify(data), Date.now())
  },

  delete: (id) => {
    db.prepare('DELETE FROM news_cache WHERE id = ?').run(id)
  }
}

// 备份操作
export const backupStore = {
  list: () => {
    return db.prepare('SELECT id, filename, created_at FROM backups ORDER BY created_at DESC').all()
  },

  get: (filename) => {
    const row = db.prepare('SELECT data FROM backups WHERE filename = ?').get(filename)
    return row ? row.data : null
  },

  put: (id, filename, data) => {
    const stmt = db.prepare(`
      INSERT INTO backups (id, filename, created_at, data)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(id, filename, Date.now(), data)
  },

  deleteOld: (daysToKeep = 30) => {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    db.prepare('DELETE FROM backups WHERE created_at < ?').run(cutoffTime)
  }
}
