// Cloudflare Pages Function
// 路径: /api/screenshot-quota
// 查询截图配额使用情况

export const onRequest = async (context) => {
  const { request, env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // GET - 查询配额
  if (request.method === 'GET') {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `screenshot-usage-${today}`
      const used = parseInt(await env.DESKTOP_DATA.get(usageKey) || '0')

      // 计算重置时间（明天 00:00:00 UTC）
      const tomorrow = new Date()
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)

      return new Response(JSON.stringify({
        used,
        limit: 600,
        remaining: Math.max(0, 600 - used),
        resetAt: tomorrow.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: '查询配额失败' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Not Found', { status: 404 })
}
