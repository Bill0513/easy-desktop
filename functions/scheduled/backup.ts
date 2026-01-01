// Cloudflare Pages Function - Scheduled Backup
// 定时备份 KV 数据到 R2
// 配置方式：在 wrangler.toml 中添加 cron triggers

export const onRequest = async (context) => {
  const { env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    // 从 KV 读取数据
    const data = await env.DESKTOP_DATA.get('user-desktop')

    if (!data) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No data to backup'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    // 生成备份文件名（包含时间戳）
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json`

    // 保存到 R2
    await env.IMAGE_BUCKET.put(filename, data, {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        backupDate: now.toISOString(),
        type: 'desktop-data-backup',
      },
    })

    // 清理旧备份（保留最近 30 天）
    await cleanOldBackups(env.IMAGE_BUCKET, 30)

    return new Response(JSON.stringify({
      success: true,
      filename,
      timestamp: now.toISOString(),
      message: 'Backup completed successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Backup failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Backup failed'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
}

// 清理旧备份文件
async function cleanOldBackups(bucket, daysToKeep) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    // 列出所有备份文件
    const list = await bucket.list({ prefix: 'backup-' })

    for (const object of list.objects) {
      // 从文件名提取日期
      const match = object.key.match(/backup-(\d{4}-\d{2}-\d{2})/)
      if (match) {
        const fileDate = new Date(match[1])
        if (fileDate < cutoffDate) {
          await bucket.delete(object.key)
          console.log(`Deleted old backup: ${object.key}`)
        }
      }
    }
  } catch (error) {
    console.error('Failed to clean old backups:', error)
  }
}
