// Cloudflare Pages Function
// 路径: /api/image

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

  // POST - 上传图片到 R2
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

      // 生成唯一文件名
      const ext = file.name.split('.').pop() || 'png'
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`

      // 上传到 R2
      await env.IMAGE_BUCKET.put(filename, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
      })

      // 返回图片 URL (使用 R2 public URL 或通过 API 访问)
      const imageUrl = `/api/image/${filename}`

      return new Response(JSON.stringify({
        success: true,
        url: imageUrl,
        filename,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // GET - 获取图片
  if (request.method === 'GET') {
    const filename = context.params?.filename

    if (!filename) {
      return new Response('Not Found', { status: 404 })
    }

    try {
      const image = await env.IMAGE_BUCKET.get(filename)

      if (!image) {
        return new Response('Not Found', { status: 404 })
      }

      return new Response(image.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': image.httpMetadata?.contentType || 'image/png',
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (error) {
      return new Response('Not Found', { status: 404 })
    }
  }

  // DELETE - 删除图片
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
      return new Response(JSON.stringify({ error: 'Delete failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Not Found', { status: 404 })
}
