/**
 * IndexedDB 工具类
 * 用于本地数据持久化，替代 localStorage
 */

const DB_NAME = 'cloud-desktop-db'
const DB_VERSION = 1
const STORE_NAME = 'desktop-data'

export interface StoredData {
  key: string
  value: any
  isDirty: boolean // 标记数据是否需要同步到云端
  updatedAt: number
}

class IndexedDBHelper {
  private db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建对象存储（如果不存在）
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          objectStore.createIndex('isDirty', 'isDirty', { unique: false })
          objectStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
    })
  }

  /**
   * 保存数据
   */
  async set(key: string, value: any, isDirty: boolean = true): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)

      const data: StoredData = {
        key,
        value,
        isDirty,
        updatedAt: Date.now()
      }

      const request = objectStore.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('IndexedDB 写入失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取数据
   */
  async get(key: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.get(key)

      request.onsuccess = () => {
        const result = request.result as StoredData | undefined
        resolve(result ? result.value : null)
      }

      request.onerror = () => {
        console.error('IndexedDB 读取失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取完整的存储数据（包含元信息）
   */
  async getStoredData(key: string): Promise<StoredData | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.get(key)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('IndexedDB 读取失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 标记数据为"干净"（已同步）
   */
  async markClean(key: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)
      const getRequest = objectStore.get(key)

      getRequest.onsuccess = () => {
        const data = getRequest.result as StoredData | undefined
        if (data) {
          data.isDirty = false
          const putRequest = objectStore.put(data)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * 检查是否有脏数据
   */
  async hasDirtyData(): Promise<boolean> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(STORE_NAME)
      const index = objectStore.index('isDirty')
      const request = index.count(IDBKeyRange.only(true))

      request.onsuccess = () => {
        resolve(request.result > 0)
      }

      request.onerror = () => {
        console.error('IndexedDB 查询失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取所有脏数据的键
   */
  async getDirtyKeys(): Promise<string[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(STORE_NAME)
      const index = objectStore.index('isDirty')
      const request = index.openCursor(IDBKeyRange.only(true))

      const keys: string[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          keys.push((cursor.value as StoredData).key)
          cursor.continue()
        } else {
          resolve(keys)
        }
      }

      request.onerror = () => {
        console.error('IndexedDB 查询失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 删除数据
   */
  async delete(key: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('IndexedDB 删除失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('IndexedDB 清空失败:', request.error)
        reject(request.error)
      }
    })
  }
}

// 导出单例
export const indexedDB = new IndexedDBHelper()
