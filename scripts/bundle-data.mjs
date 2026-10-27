// Run after an intentional OSM update, before committing the new data.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dir=resolve(root,'data/bundled')
mkdirSync(dir,{recursive:true})
const manifest=[],keep=new Set()
for(const [path,gzip,prefix] of [['public/data/lyon-network.json',true,'network'],['data/lyon-source.json.gz',false,'source']]){
 const bytes=readFileSync(resolve(root,path)),packed=gzip?gzipSync(bytes,{level:9}):bytes,parts=[]
 for(let start=0,index=0;start<packed.length;start+=512*1024,index++){
  const name=`${prefix}-${String(index).padStart(3,'0')}.bin`,part=`data/bundled/${name}`
  writeFileSync(resolve(root,part),packed.subarray(start,start+512*1024));parts.push(part);keep.add(name)
 }
 manifest.push({path,gzip,sha256:createHash('sha256').update(bytes).digest('hex'),parts})
}
writeFileSync(resolve(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
for(const name of readdirSync(dir))if(/^(network|source)-\d+\.bin$/.test(name)&&!keep.has(name))unlinkSync(resolve(dir,name))
