import express from 'express'
import { kvStore } from '../db.js'

const router = express.Router()

// GET - 获取文件元数据
router.get('/', (req, res) => {
  try {
    const data = kvStore.get('file-metadata')
    if (data) {
      res.json(JSON.parse(data))
    } else {
      res.json(null)
    }
  } catch (error) {
    console.error('Failed to fetch file metadata:', error)
    res.status(500).json({ error: 'Failed to fetch' })
  }
})

// POST - 保存文件元数据
router.post('/', (req, res) => {
  try {
    const body = req.body

    // 获取现有数据
    const existingDataStr = kvStore.get('file-metadata')

    if (existingDataStr) {
      const existingData = JSON.parse(existingDataStr)

      // 时间戳校验
      if (existingData.updatedAt && body.updatedAt) {
        if (body.updatedAt < existingData.updatedAt) {
          return res.status(409).json({
            error: 'Data conflict: server has newer data',
            conflict: true,
            serverData: existingData
          })
        }
      }

      // 空数据保护
      const hasExistingFiles = existingData.files && existingData.files.length > 0
      const hasExistingFolders = existingData.folders && existingData.folders.length > 0
      const isClientEmpty = (!body.files || body.files.length === 0) &&
                           (!body.folders || body.folders.length === 0)

      if ((hasExistingFiles || hasExistingFolders) && isClientEmpty) {
        console.warn('拒绝空数据覆盖：服务器有文件数据，客户端发送空数组')
        return res.status(409).json({
          error: 'Cannot overwrite existing data with empty data',
          conflict: true,
          serverData: existingData,
          reason: 'empty_data_protection'
        })
      }
    }

    // 保存数据
    kvStore.put('file-metadata', JSON.stringify(body))
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save file metadata:', error)
    res.status(500).json({ error: 'Failed to save' })
  }
})

export default router
