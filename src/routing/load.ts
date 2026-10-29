import manifest from './dataset-manifest.json'
import type {RoutingGraph} from './types'
import type {ScoreLinks} from './rewards'
import type {Segment} from '../types'
export interface RoutingDataset {schemaVersion:1;networkVersion:string;graph:RoutingGraph;links:ScoreLinks;score:Pick<Segment,'id'|'lengthMeters'|'district'>[]}
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
const digest=async(b:Uint8Array)=>hex(await crypto.subtle.digest('SHA-256',b as Uint8Array<ArrayBuffer>))
/** Fetch only on demand, verify every chunk, and reuse immutable parts offline.
 * Cache failures (private browsing/quota) must never disable online routing. */
export async function loadRoutingDataset(networkVersion:string,onProgress:(percent:number)=>void):Promise<RoutingDataset>{
 if(manifest.networkVersion!==networkVersion)throw Error('Le réseau des parcours ne correspond pas à la carte. Rechargez l’application.')
 let cache:Cache|undefined
 try{cache=await caches.open('lyon-routing-v1')}catch{/* optional cache */}
 const all=new Uint8Array(manifest.bytes);let offset=0
 for(let i=0;i<manifest.parts.length;i++){
  const part=manifest.parts[i],url=`${import.meta.env.BASE_URL}${part.path}`
  let response:Response|undefined
  try{response=await cache?.match(url)}catch{/* optional cache */}
  let bytes=response?new Uint8Array(await response.arrayBuffer()):null
  if(bytes&&(bytes.length!==part.bytes||await digest(bytes)!==part.sha256)){try{await cache?.delete(url)}catch{/* quota */}bytes=null}
  if(!bytes){
   const fetched=await fetch(url).catch(()=>{throw Error('Les données de parcours ne sont pas encore disponibles hors ligne. Réessayez avec une connexion.')})
   if(!fetched.ok)throw Error('Impossible de charger les données de parcours. Réessayez dans un instant.')
   bytes=new Uint8Array(await fetched.arrayBuffer())
   if(bytes.length!==part.bytes||await digest(bytes)!==part.sha256)throw Error('Les données de parcours sont incomplètes. Réessayez avec une connexion.')
   try{await cache?.put(url,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}))}catch{/* online operation remains available */}
  }
  all.set(bytes,offset);offset+=bytes.length;onProgress(Math.round(100*(i+1)/manifest.parts.length))
 }
 if(offset!==manifest.bytes||await digest(all)!==manifest.sha256)throw Error('La vérification des données de parcours a échoué.')
 const data:RoutingDataset=JSON.parse(new TextDecoder().decode(all))
 if(data.schemaVersion!==1||data.networkVersion!==networkVersion||data.graph.sourceHash!==manifest.sourceHash||data.links.sourceHash!==manifest.sourceHash||data.graph.audit.missing.length||!data.graph.edges.length)throw Error('Le réseau des parcours est incompatible.')
 try{const keep=new Set(manifest.parts.map(p=>new URL(`${import.meta.env.BASE_URL}${p.path}`,self.location.origin).href));for(const key of await cache?.keys()||[])if(!keep.has(key.url))await cache?.delete(key)}catch{/* best effort cleanup */}
 return data
}
