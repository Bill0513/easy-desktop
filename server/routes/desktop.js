import express from 'express'
import { kvStore } from '../db.js'

const router = express.Router()

// GET - 获取桌面数据
router.get('/', (req, res) => {
  try {
    const data = kvStore.get('user-desktop')
    if (data) {
      res.json(JSON.parse(data))
    } else {
      res.json(null)
    }
  } catch (error) {
    console.error('Failed to fetch desktop data:', error)
    res.status(500).json({ error: 'Failed to fetch' })
  }
})

// POST - 保存桌面数据
router.post('/', (req, res) => {
  try {
    const body = req.body

    // 获取现有数据
    const existingDataStr = kvStore.get('user-desktop')

    if (existingDataStr) {
      const existingData = JSON.parse(existingDataStr)

      // 时间戳校验
      if (existingData.updatedAt && body.updatedAt) {
        if (body.updatedAt < existingData.updatedAt) {
          return res.status(409).json({
            error: 'Data conflict: server has newer data',
            conflict: true,
            serverData: existingData,
            clientTimestamp: body.updatedAt,
            serverTimestamp: existingData.updatedAt
          })
        }
      }

      // 空数据保护
      const hasExistingWidgets = existingData.widgets && existingData.widgets.length > 0
      const hasExistingNavigation = existingData.navigationSites && existingData.navigationSites.length > 0
      const isClientEmpty = (!body.widgets || body.widgets.length === 0) &&
                           (!body.navigationSites || body.navigationSites.length === 0)

      if ((hasExistingWidgets || hasExistingNavigation) && isClientEmpty) {
        console.warn('拒绝空数据覆盖：服务器有数据，客户端发送空数组')
        return res.status(409).json({
          error: 'Cannot overwrite existing data with empty data',
          conflict: true,
          serverData: existingData,
          reason: 'empty_data_protection'
        })
      }
    }

    // 保存数据
    kvStore.put('user-desktop', JSON.stringify(body))
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save desktop data:', error)
    res.status(500).json({ error: 'Failed to save' })
  }
})

// DELETE - 删除桌面数据
router.delete('/', (req, res) => {
  try {
    kvStore.delete('user-desktop')
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete desktop data:', error)
    res.status(500).json({ error: 'Failed to delete' })
  }
})

export default router
