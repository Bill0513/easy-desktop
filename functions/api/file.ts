// Cloudflare Pages Function
// 路径: /api/file

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export const onRequest = async (context) => {
  const { request, env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // POST - 上传文件到 R2
  if (request.method === 'POST') {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({
          error: `File size exceeds 20MB limit (${Math.round(file.size / 1024 / 1024)}MB)`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 生成唯一文件名
      const ext = file.name.split('.').pop() || 'bin'
      const filename = `files/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`

      // 上传到 R2
      await env.IMAGE_BUCKET.put(filename, file.stream(), {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream',
        },
      })

      // 返回文件信息
      return new Response(JSON.stringify({
        success: true,
        filename,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Upload error:', error)
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // GET - 获取文件
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const filename = url.pathname.split('/api/file/')[1]

    if (!filename) {
      return new Response('Not Found', { status: 404 })
    }

    try {
      const file = await env.IMAGE_BUCKET.get(filename)

      if (!file) {
        return new Response('Not Found', { status: 404 })
      }

      return new Response(file.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (error) {
      console.error('Get file error:', error)
      return new Response('Not Found', { status: 404 })
    }
  }

  // DELETE - 删除文件
  if (request.method === 'DELETE') {
    try {
      const body = await request.json()
      const { filename } = body

      if (!filename) {
        return new Response(JSON.stringify({ error: 'No filename provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 从 R2 删除
      await env.IMAGE_BUCKET.delete(filename)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Delete error:', error)
      return new Response(JSON.stringify({ error: 'Delete failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
}
