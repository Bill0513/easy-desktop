/**
 * 通用的 fetch 工具函数
 */
export async function myFetch(url: string, options?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.text()
}

/**
 * D1 数据库缓存类
 */
export class NewsCache {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  async init() {
    try {
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS news_cache (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated INTEGER NOT NULL
        )
      `).run()
      console.log('News cache table initialized')
    } catch (error) {
      console.error('Failed to init news cache table:', error)
    }
  }

  async get(sourceId: string): Promise<{ items: any[], updated: number } | null> {
    try {
      const result = await this.db
        .prepare('SELECT data, updated FROM news_cache WHERE id = ?')
        .bind(sourceId)
        .first()

      if (result) {
        return {
          items: JSON.parse(result.data as string),
          updated: result.updated as number,
        }
      }
      return null
    } catch (error) {
      console.error(`Failed to get cache for ${sourceId}:`, error)
      return null
    }
  }

  async set(sourceId: string, items: any[]) {
    try {
      const now = Date.now()
      await this.db
        .prepare('INSERT OR REPLACE INTO news_cache (id, data, updated) VALUES (?, ?, ?)')
        .bind(sourceId, JSON.stringify(items), now)
        .run()
      console.log(`Cache set for ${sourceId}`)
    } catch (error) {
      console.error(`Failed to set cache for ${sourceId}:`, error)
    }
  }

  async delete(sourceId: string) {
    try {
      await this.db
        .prepare('DELETE FROM news_cache WHERE id = ?')
        .bind(sourceId)
        .run()
      console.log(`Cache deleted for ${sourceId}`)
    } catch (error) {
      console.error(`Failed to delete cache for ${sourceId}:`, error)
    }
  }
}

