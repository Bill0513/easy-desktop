// Cloudflare Pages Function
// 路径: /api/screenshot
// 使用 Cloudflare Browser Rendering 进行网页截图

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

  // POST - 截图并上传到 R2
  if (request.method === 'POST') {
    try {
      const { url } = await request.json()

      if (!url) {
        return new Response(JSON.stringify({ error: '缺少 URL 参数' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 检查今日配额
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `screenshot-usage-${today}`
      const used = parseInt(await env.DESKTOP_DATA.get(usageKey) || '0')

      if (used >= 600) { // 10分钟 = 600秒
        return new Response(JSON.stringify({
          error: '今日截图配额已用完',
          used,
          limit: 600,
          remaining: 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const startTime = Date.now()

      // 动态导入 puppeteer (避免构建时解析错误)
      const puppeteer = await import('@cloudflare/puppeteer')

      // 启动浏览器并截图
      const browser = await puppeteer.default.launch(env.MYBROWSER)
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 800 })

      try {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        })
      } catch (e) {
        // 如果 networkidle0 超时，尝试 domcontentloaded
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
      }

      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false
      })
      await browser.close()

      // 计算耗时
      const elapsed = Math.ceil((Date.now() - startTime) / 1000)

      // 上传到 R2
      const key = `screenshots/${Date.now()}-${crypto.randomUUID()}.jpg`
      await env.IMAGE_BUCKET.put(key, screenshot, {
        httpMetadata: {
          contentType: 'image/jpeg',
        },
      })

      // 更新配额
      await env.DESKTOP_DATA.put(usageKey, String(used + elapsed), {
        expirationTtl: 86400 // 24小时后过期
      })

      return new Response(JSON.stringify({
        success: true,
        key,
        url: `/api/image/${key}`,
        used: used + elapsed,
        limit: 600,
        remaining: Math.max(0, 600 - used - elapsed)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Screenshot error:', error)
      return new Response(JSON.stringify({
        error: '截图失败: ' + (error.message || '未知错误')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Not Found', { status: 404 })
}
