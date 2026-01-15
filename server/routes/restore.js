import express from 'express'
import { backupStore, kvStore } from '../db.js'

const router = express.Router()

// GET - 列出所有备份
router.get('/', (req, res) => {
  try {
    const backups = backupStore.list()
    res.json(backups)
  } catch (error) {
    console.error('Failed to list backups:', error)
    res.status(500).json({ error: 'Failed to list backups' })
  }
})

// POST - 恢复备份
router.post('/', (req, res) => {
  try {
    const { filename } = req.body

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' })
    }

    const backupData = backupStore.get(filename)

    if (!backupData) {
      return res.status(404).json({ error: 'Backup not found' })
    }

    // 恢复数据到 KV
    const data = JSON.parse(backupData)
    kvStore.put('user-desktop', JSON.stringify(data))

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to restore backup:', error)
    res.status(500).json({ error: 'Failed to restore backup' })
  }
})

export default router
