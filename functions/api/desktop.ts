// Cloudflare Pages Function
// 路径: /api/desktop

export const onRequest = async (context) => {
  const { request, env } = context

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    // GET - 获取桌面数据
    if (request.method === 'GET') {
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
            // 返回 null 表示没有数据，而不是空对象
            return new Response('null', {
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
    if (request.method === 'POST') {
        try {
            const body = await request.json()

            // 获取云端现有数据
            const existingDataStr = await env.DESKTOP_DATA.get('user-desktop')

            if (existingDataStr) {
                const existingData = JSON.parse(existingDataStr)

                // 时间戳校验：只有当客户端数据更新时间晚于云端数据时才允许保存
                if (existingData.updatedAt && body.updatedAt) {
                    if (body.updatedAt < existingData.updatedAt) {
                        // 客户端数据较旧，拒绝保存
                        return new Response(JSON.stringify({
                            error: 'Data conflict: server has newer data',
                            conflict: true,
                            serverData: existingData,
                            clientTimestamp: body.updatedAt,
                            serverTimestamp: existingData.updatedAt
                        }), {
                            status: 409, // Conflict
                            headers: {
                                ...corsHeaders,
                                'Content-Type': 'application/json',
                            },
                        })
                    }
                }
            }

            // 保存数据
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
    if (request.method === 'DELETE') {
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
}

