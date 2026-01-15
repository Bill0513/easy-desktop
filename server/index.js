import express from 'express'
import cors from 'cors'
import { initDatabase } from './db.js'
import desktopRouter from './routes/desktop.js'
import imageRouter from './routes/image.js'
import fileRouter from './routes/file.js'
import fileMetadataRouter from './routes/file-metadata.js'
import newsRouter from './routes/news.js'
import restoreRouter from './routes/restore.js'
import backupRouter from './routes/backup.js'

const app = express()
const PORT = 3001

// 初始化数据库
initDatabase()

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 路由
app.use('/api/desktop', desktopRouter)
app.use('/api/image', imageRouter)
app.use('/api/file', fileRouter)
app.use('/api/file-metadata', fileMetadataRouter)
app.use('/api/news', newsRouter)
app.use('/api/restore', restoreRouter)
app.use('/scheduled/backup', backupRouter)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: 'local' })
})

app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: LOCAL`)
  console.log(`💾 Database: SQLite (./server/data/local.db)`)
  console.log(`📁 File storage: ./server/storage/`)
})
