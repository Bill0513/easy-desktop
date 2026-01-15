// 测试本地服务器是否正常运行
// 运行: node test-server.js

async function testServer() {
  console.log('🧪 测试本地开发服务器...\n')

  // 测试健康检查
  try {
    const healthResponse = await fetch('http://localhost:3001/health')
    const healthData = await healthResponse.json()
    console.log('✅ 健康检查:', healthData)
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message)
    console.log('\n请确保本地服务器正在运行: npm run dev:server')
    return
  }

  // 测试桌面数据 API
  try {
    const desktopResponse = await fetch('http://localhost:3001/api/desktop')
    const desktopData = await desktopResponse.json()
    console.log('✅ 桌面数据 API:', desktopData === null ? '无数据（正常）' : '有数据')
  } catch (error) {
    console.error('❌ 桌面数据 API 失败:', error.message)
  }

  console.log('\n✨ 测试完成！')
  console.log('\n如果所有测试通过，请确保:')
  console.log('1. Vite 服务器已重启 (Ctrl+C 然后重新运行 npm run dev)')
  console.log('2. 浏览器已刷新 (Ctrl+Shift+R 强制刷新)')
}

testServer()
