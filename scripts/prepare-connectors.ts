import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {eligible,prepareNetwork} from './prepare'
import type {Network} from '../src/types'
/** Public pedestrian crossings connect streets but are not exploration objectives. */
export function prepareConnectors(raw:Parameters<typeof prepareNetwork>[0]){
 const ways=raw.ways.filter(w=>['crossing','traffic_island','tram_crossing'].includes(w.tags.footway)&&eligible({...w.tags,footway:''})).flatMap(w=>w.coordinates.slice(1).map((b,i)=>({...w,nodes:[w.nodes[i],w.nodes[i+1]],coordinates:[w.coordinates[i],b],tags:{...w.tags,footway:''}})))
 if(!ways.length)return []
 return prepareNetwork({...raw,ways}).segments.map(s=>({...s,id:`connector:${s.id}`,connector:true,footway:'crossing'}))
}
if(process.argv[1]?.endsWith('prepare-connectors.ts')){
 const n:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8')),target='public/data/lyon-connectors.json'
 const old=existsSync(target)?JSON.parse(readFileSync(target,'utf8')):undefined
 if(old?.sourceHash!==n.sourceHash||old?.networkVersion!==n.version||old?.rules!==1){
  const raw=JSON.parse(gunzipSync(readFileSync('data/lyon-source.json.gz')).toString())
  if(createHash('sha256').update(JSON.stringify(raw)).digest('hex')!==n.sourceHash)throw new Error('La source des liaisons doit correspondre au réseau livré.')
  const connectors=prepareConnectors(raw)
  writeFileSync(target,JSON.stringify({networkVersion:n.version,sourceHash:n.sourceHash,rules:1,connectors}))
  console.log(`${connectors.length} liaisons piétonnes préparées, hors kilomètres de progression.`)
 }
}
