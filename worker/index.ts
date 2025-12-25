export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)

    // GET - 获取桌面数据
    if (request.method === 'GET' && url.pathname === '/api/desktop') {
      try {
        const data = await env.DESKTOP_DATA.get('user-desktop')
        if (data) {
          return new Response(data, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          })
        }
        return new Response('{}', {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
    }

    // POST - 保存桌面数据
    if (request.method === 'POST' && url.pathname === '/api/desktop') {
      try {
        const body = await request.json()
        await env.DESKTOP_DATA.put('user-desktop', JSON.stringify(body))
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to save' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
    }

    // DELETE - 删除桌面数据
    if (request.method === 'DELETE' && url.pathname === '/api/desktop') {
      try {
        await env.DESKTOP_DATA.delete('user-desktop')
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to delete' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
}
