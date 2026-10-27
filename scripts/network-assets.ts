import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'
import type { Network } from '../src/types'
/** Split only the distribution format; geometry, IDs and network version are unchanged. */
export function networkAssets(): Plugin {
  let outputDirectory = ''
  return {
    name: 'lyon-network-assets', apply: 'build',
    configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir) },
    generateBundle() {
      const network: Network = JSON.parse(readFileSync('public/data/lyon-network.json', 'utf8'))
      const { segments, ...metadata } = network
      const parts: string[] = []
      for (let i = 0; i < segments.length; i += 20000) {
        const source = JSON.stringify(segments.slice(i, i + 20000))
        const hash = createHash('sha256').update(source).digest('hex').slice(0, 16)
        const fileName = `data/network-${hash}.json`
        parts.push(fileName)
        this.emitFile({ type: 'asset', fileName, source })
      }
      this.emitFile({ type: 'asset', fileName: 'data/network-index.json', source: JSON.stringify({ ...metadata, parts }) })
    },
    writeBundle() {
      // Vite copies public files before this hook; Workbox runs after it.
      rmSync(resolve(outputDirectory, 'data/lyon-network.json'), { force: true })
    },
  }
}
