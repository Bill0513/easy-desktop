interface Env {
  AI: any
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { data, isRawText } = await context.request.json()

    if (!data) {
      return new Response(JSON.stringify({ error: '缺少数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 准备发送给AI的数据
    let dataForAI: string
    if (isRawText) {
      // 如果是原始文本，直接使用
      dataForAI = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    } else {
      // 如果是已解析的对象，转为JSON字符串
      dataForAI = JSON.stringify(data, null, 2)
    }

    // 使用 Cloudflare Workers AI 转换数据格式
    const prompt = `你是一个数据格式转换助手。用户提供了一个可能包含导航网站数据的文件内容，你需要：

1. 首先判断这个数据是否包含网站导航信息（网站名称、URL等）
2. 如果包含，将它转换成以下格式之一：

优先格式（带分类）：
{
  "navConfig": [
    {
      "name": "分类名",
      "children": [
        {
          "name": "网站名",
          "url": "网站URL",
          "src": "图标URL（可选）",
          "backgroundColor": "背景色（可选）"
        }
      ]
    }
  ]
}

备选格式（简单数组）：
[
  {
    "name": "网站名",
    "url": "网站URL",
    "src": "图标URL（可选）",
    "backgroundColor": "背景色（可选）",
    "category": "分类名（可选）"
  }
]

转换规则：
1. 必须提取出网站名称(name)和URL(url)
2. 如果原数据有分类信息，优先使用带分类的格式
3. 如果原数据没有明确分类，使用简单数组格式
4. 保留图标URL和背景色信息（如果有）
5. 如果数据不包含网站导航信息，返回错误信息：{"error": "无法识别为导航数据"}
6. 只返回转换后的JSON，不要有任何其他文字说明
7. 确保返回的是有效的JSON格式

用户提供的原始数据：
${dataForAI}

请分析并转换（如果是导航数据）或返回错误信息：`

    const response = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: '你是一个专业的数据格式转换助手，只返回JSON格式的数据，不要有任何其他说明文字。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4096,
      temperature: 0.1
    })

    let transformedData
    try {
      // 提取AI返回的文本
      const aiText = response.response || response.result?.response || ''

      // 尝试从文本中提取JSON（可能包含markdown代码块）
      let jsonText = aiText.trim()

      // 移除可能的markdown代码块标记
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      transformedData = JSON.parse(jsonText)

      // 检查是否是错误响应
      if (transformedData.error) {
        return new Response(JSON.stringify({
          error: transformedData.error || '无法识别为有效的导航数据'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

    } catch (parseError) {
      console.error('AI返回的数据解析失败:', parseError)
      return new Response(JSON.stringify({
        error: 'AI 无法识别数据格式，请确保文件包含网站导航信息',
        details: response.response || response.result?.response || '无响应'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      data: transformedData
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Transform error:', error)
    return new Response(JSON.stringify({
      error: '转换失败',
      details: error instanceof Error ? error.message : '未知错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
