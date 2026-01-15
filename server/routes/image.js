import express from 'express'
import multer from 'multer'
import { mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// 存储目录
const STORAGE_DIR = join(__dirname, '..', 'storage', 'images')
if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true })
}

// 配置 multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
})

// POST - 上传图片
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const filename = `${Date.now()}-${req.file.originalname}`
    const filepath = join(STORAGE_DIR, filename)

    writeFileSync(filepath, req.file.buffer)

    res.json({
      success: true,
      url: `/api/image/${filename}`,
      key: filename
    })
  } catch (error) {
    console.error('Failed to upload image:', error)
    res.status(500).json({ error: 'Failed to upload' })
  }
})

// GET - 获取图片
router.get('/:filename', (req, res) => {
  try {
    const filepath = join(STORAGE_DIR, req.params.filename)

    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const file = readFileSync(filepath)

    // 根据文件扩展名设置 Content-Type
    const ext = req.params.filename.split('.').pop().toLowerCase()
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    }

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream')
    res.send(file)
  } catch (error) {
    console.error('Failed to get image:', error)
    res.status(500).json({ error: 'Failed to get image' })
  }
})

// DELETE - 删除图片
router.delete('/:filename', (req, res) => {
  try {
    const filepath = join(STORAGE_DIR, req.params.filename)

    if (existsSync(filepath)) {
      unlinkSync(filepath)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete image:', error)
    res.status(500).json({ error: 'Failed to delete' })
  }
})

export default router
