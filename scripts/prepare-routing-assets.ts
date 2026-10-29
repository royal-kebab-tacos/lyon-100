import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,unlinkSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {prepareRouting} from './prepare-routing'
import {linkRoutingScore} from '../src/routing/rewards'
import type {RoutingSource} from '../src/routing/types'
import type {Network} from '../src/types'
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex')
const manifest=JSON.parse(readFileSync('data/routing/manifest.json','utf8'))
const packed=Buffer.concat(manifest.parts.map((p:string)=>readFileSync(p)))
if(hash(packed)!==manifest.sha256)throw Error('Incomplete public OSM routing patch')
const patch=JSON.parse(gunzipSync(packed).toString()),network:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8'))
if(patch.baseSourceHash!==network.sourceHash)throw Error('Routing patch does not match the scoring source')
const elevationManifest=JSON.parse(readFileSync('data/routing/elevation-manifest.json','utf8'))
const elevationPacked=Buffer.concat(elevationManifest.parts.map((p:string)=>readFileSync(p)))
if(hash(elevationPacked)!==elevationManifest.sha256)throw Error('Incomplete public IGN altitude archive')
const elevation=JSON.parse(gunzipSync(elevationPacked).toString())
const rules=['scripts/prepare-routing-assets.ts','scripts/prepare-routing.ts','scripts/prepare.ts','src/routing/access.ts','src/routing/rewards.ts'].map(p=>readFileSync(p,'utf8')).join('\n')
const fingerprint=hash(manifest.sha256+elevationManifest.sha256+network.version+rules),metaPath='src/routing/dataset-manifest.json'
const existing=existsSync(metaPath)?JSON.parse(readFileSync(metaPath,'utf8')):null
if(existing?.fingerprint===fingerprint&&existing.parts.every((p:{path:string;sha256:string})=>existsSync('public/'+p.path)&&hash(readFileSync('public/'+p.path))===p.sha256)){
 console.log('Routing assets verified (cached).')
}else{
 const base:RoutingSource=JSON.parse(gunzipSync(readFileSync('data/lyon-source.json.gz')).toString())
 if(hash(JSON.stringify(base))!==patch.baseSourceHash)throw Error('Scoring source integrity check failed')
 const ways=new Map(base.ways.map(w=>[w.id,w]))
 for(const id of patch.remove)ways.delete(id)
 for(const w of patch.upsert as RoutingSource['ways'])ways.set(w.id,w)
 const raw:RoutingSource={...patch.metadata,ways:[...ways.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1)}
 const graph=prepareRouting(raw),links=linkRoutingScore(graph,network.segments)
 if(graph.audit.missing.length)throw Error('Incomplete routing metadata')
 if(elevation.sourceHash!==graph.sourceHash)throw Error('Altitudes do not match routing graph')
 const score=network.segments.map(({id,lengthMeters,district})=>({id,lengthMeters,district}))
 const bytes=Buffer.from(JSON.stringify({schemaVersion:1,networkVersion:network.version,graph,links,score,districts:network.districts||[],elevation}))
 mkdirSync('public/routing',{recursive:true})
 const parts:{path:string;sha256:string;bytes:number}[]=[]
 for(let i=0;i<bytes.length;i+=1024*1024){const part=bytes.subarray(i,i+1024*1024),sha256=hash(part),path=`routing/part-${sha256.slice(0,20)}.txt`;writeFileSync('public/'+path,part);parts.push({path,sha256,bytes:part.length})}
 for(const name of readdirSync('public/routing'))if(!parts.some(p=>p.path==='routing/'+name))unlinkSync('public/routing/'+name)
 const metadata={schemaVersion:1,fingerprint,networkVersion:network.version,sha256:hash(bytes),sourceHash:graph.sourceHash,sourceDate:manifest.sourceDate,pbfSha256:manifest.pbfSha256,linkedMeters:links.linkedMeters,totalMeters:network.totalMeters,bytes:bytes.length,parts}
 writeFileSync(metaPath,JSON.stringify(metadata,null,2)+'\n')
 console.log(`Routing: ${graph.edges.length} edges, ${parts.length} lazy-loaded parts (${(bytes.length/1024/1024).toFixed(1)} MB uncompressed).`)
}
