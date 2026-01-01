// Cloudflare Pages Function
// 路径: /api/restore
// 从 R2 恢复备份数据到 KV

export const onRequest = async (context) => {
  const { request, env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // GET - 列出所有备份文件
  if (request.method === 'GET') {
    try {
      const list = await env.IMAGE_BUCKET.list({ prefix: 'backup-' })

      const backups = list.objects.map(obj => ({
        filename: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
      })).sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded))

      return new Response(JSON.stringify({
        success: true,
        backups,
        count: backups.length
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to list backups'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }
  }

  // POST - 从指定备份文件恢复数据
  if (request.method === 'POST') {
    try {
      const { filename } = await request.json()

      if (!filename) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Filename is required'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }

      // 从 R2 读取备份文件
      const object = await env.IMAGE_BUCKET.get(filename)

      if (!object) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Backup file not found'
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }

      const backupData = await object.text()

      // 恢复到 KV
      await env.DESKTOP_DATA.put('user-desktop', backupData)

      return new Response(JSON.stringify({
        success: true,
        message: 'Data restored successfully',
        filename
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Failed to restore backup'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
