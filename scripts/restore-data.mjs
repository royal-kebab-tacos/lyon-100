import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
for(const item of JSON.parse(readFileSync(resolve(root,'data/bundled/manifest.json'),'utf8'))){
 const target=resolve(root,item.path)
 // Explicit OSM updates remain usable; only reconstruct missing data.
 if(existsSync(target))continue
 const packed=Buffer.concat(item.parts.map(p=>readFileSync(resolve(root,p))))
 const bytes=item.gzip?gunzipSync(packed):packed
 if(digest(bytes)!==item.sha256)throw new Error(`Données cartographiques incomplètes : ${item.path}`)
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target+'.tmp',bytes);renameSync(target+'.tmp',target)
 console.log(`Données OSM restaurées : ${item.path}`)
}
