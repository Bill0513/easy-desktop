import express from 'express'
import { backupStore, kvStore } from '../db.js'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// POST - 创建备份
router.post('/', (req, res) => {
  try {
    // 获取当前数据
    const desktopData = kvStore.get('user-desktop')
    const fileMetadata = kvStore.get('file-metadata')

    if (!desktopData && !fileMetadata) {
      return res.status(400).json({ error: 'No data to backup' })
    }

    // 创建备份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json`
    const backupData = {
      desktop: desktopData ? JSON.parse(desktopData) : null,
      fileMetadata: fileMetadata ? JSON.parse(fileMetadata) : null,
      createdAt: Date.now(),
    }

    backupStore.put(uuidv4(), filename, JSON.stringify(backupData))

    // 清理旧备份（保留 30 天）
    backupStore.deleteOld(30)

    res.json({
      success: true,
      filename,
      message: 'Backup created successfully',
    })
  } catch (error) {
    console.error('Failed to create backup:', error)
    res.status(500).json({ error: 'Failed to create backup' })
  }
})

export default router
