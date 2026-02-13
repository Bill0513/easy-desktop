import { buildIndexData, writeIndexFiles } from './lib.mjs'

async function main() {
  const index = await buildIndexData()
  const written = await writeIndexFiles(index)

  console.log(`Code map generated: ${written.jsonPath}`)
  console.log(`Code map generated: ${written.mdPath}`)
  console.log(`Modules: ${index.stats.totalModules}, Files: ${index.stats.totalFiles}`)
}

main().catch((error) => {
  console.error('Failed to build code map:', error)
  process.exit(1)
})
