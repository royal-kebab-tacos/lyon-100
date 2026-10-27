import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { lineString, point } from '@turf/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import lineIntersect from '@turf/line-intersect'
import lineSliceAlong from '@turf/line-slice-along'
import along from '@turf/along'
import type { Coordinate, Network, Segment } from '../src/types/index.ts'
import { lineLength } from '../src/utils/geometry.ts'
import { SEGMENT_MAX_METERS } from '../src/utils/config.ts'
interface Way { id: string; tags: Record<string,string>; nodes: string[]; coordinates: Coordinate[] }
interface Raw { districts?: Network['districts']; boundary: Network['boundary']; ways: Way[]; source: string; sourceDate: string }
const snapshotPath = 'data/lyon-source.json.gz'
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')
const sleep = (ms: number) => new Promise(r => setTimeout(r,ms))
const allowed = new Set(['residential','living_street','pedestrian','unclassified','tertiary','secondary','primary','service','footway','path','steps','cycleway','track'])
const publicAccess = new Set(['yes','designated','permissive'])
export function eligible(tags: Record<string,string>): boolean {
  if (!allowed.has(tags.highway) || tags.area === 'yes' || tags['foot:conditional'] || tags['access:conditional']) return false
  if (['no','private'].includes(tags.foot) || tags.construction || tags.proposed || tags.informal === 'yes') return false
  if (['crossing','traffic_island','access_aisle','link','tram_crossing'].includes(tags.footway)) return false
  if (tags.highway === 'cycleway' && !publicAccess.has(tags.foot)) return false
  if (tags.highway === 'track' && !['grade1','grade2'].includes(tags.tracktype)) return false
  const access = tags.foot === 'use_sidepath' && ['residential','living_street','unclassified','tertiary','secondary','primary'].includes(tags.highway) ? 'yes' : tags.foot ?? tags.access
  if (access !== undefined && !publicAccess.has(access)) return false
  if (tags.highway === 'service') return publicAccess.has(access) && !['parking_aisle','driveway','drive-through','emergency_access'].includes(tags.service)
  return true
}
const same = (a: Coordinate, b: Coordinate) => Math.abs(a[0]-b[0]) < 1e-9 && Math.abs(a[1]-b[1]) < 1e-9
export function clipLine(coords: Coordinate[], boundary: Network['boundary']): Coordinate[][] {
  const result: Coordinate[][] = []
  let current: Coordinate[] = []
  const finish = () => { if (current.length >= 2 && lineLength(current) > 0.01) result.push(current); current = [] }
  for (let i=1;i<coords.length;i++) {
    const a=coords[i-1], b=coords[i]
    if (same(a,b)) continue
    const intersections = lineIntersect(lineString([a,b]), boundary).features.map(f => f.geometry.coordinates as Coordinate)
    const direction = [b[0]-a[0],b[1]-a[1]]
    const points = [a,...intersections,b].sort((p,q) => ((p[0]-q[0])*direction[0]+(p[1]-q[1])*direction[1]))
    for (let j=1;j<points.length;j++) {
      const p=points[j-1],q=points[j]
      if (same(p,q)) continue
      const midpoint: Coordinate = [(p[0]+q[0])/2,(p[1]+q[1])/2]
      if (!booleanPointInPolygon(point(midpoint),boundary)) { finish(); continue }
      if (current.length && !same(current.at(-1)!,p)) finish()
      if (!current.length) current.push(p)
      current.push(q)
    }
  }
  finish(); return result
}
function assembleRings(members: { geometry?: {lon:number;lat:number}[] }[]): Coordinate[][] {
  const lines = members.filter(m => m.geometry?.length).map(m => m.geometry!.map(p => [p.lon,p.lat] as Coordinate))
  const result: Coordinate[][]=[]
  while(lines.length) {
    let ring=lines.pop()!
    while(!same(ring[0],ring.at(-1)!)) {
      const i=lines.findIndex(l=>same(l[0],ring.at(-1)!)||same(l.at(-1)!,ring.at(-1)!))
      if(i<0) throw new Error('Frontière OSM incomplète.')
      let next=lines.splice(i,1)[0]
      if(!same(next[0],ring.at(-1)!))next=next.reverse()
      ring=ring.concat(next.slice(1))
    }
    result.push(ring)
  }
  return result
}
async function fromOverpass(): Promise<Raw> {
  const query='[out:json][timeout:30];rel["boundary"="administrative"]["ref:INSEE"="69123"];out geom;map_to_area->.lyon;way(area.lyon)["highway"~"^(residential|living_street|pedestrian|unclassified|service|tertiary|secondary|primary|footway|path|steps|cycleway|track)$"];out geom;'
  for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']) {
    for(let attempt=0;attempt<2;attempt++) {
      try {
        console.log(`Téléchargement OSM : ${endpoint}, essai ${attempt+1}/2`)
        const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(40_000)})
        if(!response.ok)throw new Error(`HTTP ${response.status}`)
        const data=await response.json()
        if(data.remark)throw new Error(data.remark)
        const relation=data.elements.find((e:{type:string;tags?:Record<string,string>})=>e.type==='relation'&&e.tags?.['ref:INSEE']==='69123')
        if(!relation)throw new Error('Frontière absente.')
        const outers=assembleRings(relation.members.filter((m:{role:string})=>m.role==='outer'))
        const inners=assembleRings(relation.members.filter((m:{role:string})=>m.role==='inner'))
        const boundary: Network['boundary']={type:'MultiPolygon',coordinates:outers.map(outer=>[outer,...inners.filter(inner=>booleanPointInPolygon(point(inner[0]),{type:'Polygon',coordinates:[outer]}))])}
        const ways=data.elements.filter((e:{type:string})=>e.type==='way').map((e:{id:number;tags:Record<string,string>;nodes:number[];geometry:{lon:number;lat:number}[]})=>({id:String(e.id),tags:e.tags,nodes:e.nodes.map(String),coordinates:e.geometry.map(p=>[p.lon,p.lat])}))
        return {boundary,ways,source:`OpenStreetMap / Overpass — ${endpoint}`,sourceDate:data.osm3s?.timestamp_osm_base || new Date().toISOString()}
      }catch(e){console.warn(`Source indisponible : ${e instanceof Error ? e.message : 'erreur réseau'}`);if(attempt===0)await sleep(1000)}
    }
  }
  throw new Error('Overpass ne répond pas.')
}
async function fallbackPbf():Promise<Raw> {
  await mkdir('.osm-cache',{recursive:true})
  const file='.osm-cache/Lyon.osm.pbf'
  let date=process.argv.find(a=>a.startsWith('--source-date='))?.split('=')[1] || new Date().toISOString()
  if(!process.argv.includes('--pbf')) {
    console.log('Repli sur l’extrait OSM BBBike de Lyon (environ 72 Mo)…')
    const response=await fetch('https://download.bbbike.org/osm/bbbike/Lyon/Lyon.osm.pbf',{signal:AbortSignal.timeout(180_000)})
    if(!response.ok)throw new Error(`Extrait indisponible (HTTP ${response.status}).`)
    date=response.headers.get('last-modified') || date
    await writeFile(file,Buffer.from(await response.arrayBuffer()))
  }
  const extract=spawnSync('python3',['scripts/extract-pbf.py',file,'.osm-cache/source.json.gz',date],{stdio:'inherit'})
  if(extract.status!==0)throw new Error('Extraction impossible. Pour le repli PBF : installer Python puis python3 -m pip install osmium. Le réseau précédent a été conservé.')
  return JSON.parse(gunzipSync(await readFile('.osm-cache/source.json.gz')).toString())
}
export function prepareNetwork(raw: Raw): Network {
  const sourceHash=hash(JSON.stringify(raw))
  const version=`lyon-v2-${hash(sourceHash+'rules-4-pedestrian-priority-sidepath-nonredundant-sidewalks').slice(0,16)}`
  const boundaryPoints = (raw.boundary.type === 'Polygon' ? raw.boundary.coordinates.flat() : raw.boundary.coordinates.flat(2)) as Coordinate[]
  const minX=Math.min(...boundaryPoints.map(p=>p[0])),maxX=Math.max(...boundaryPoints.map(p=>p[0])),minY=Math.min(...boundaryPoints.map(p=>p[1])),maxY=Math.max(...boundaryPoints.map(p=>p[1]))
  const ways=raw.ways.filter(w=>eligible(w.tags) && !w.coordinates.every(p=>p[0]<minX) && !w.coordinates.every(p=>p[0]>maxX) && !w.coordinates.every(p=>p[1]<minY) && !w.coordinates.every(p=>p[1]>maxY)).sort((a,b)=>a.id.localeCompare(b.id))
  const nodeUses=new Map<string,number>()
  for(const w of ways)for(const n of new Set(w.nodes))nodeUses.set(n,(nodeUses.get(n)||0)+1)
  const districts=(raw.districts||[]).map(d=>{const points=(d.boundary.type==='Polygon'?d.boundary.coordinates.flat():d.boundary.coordinates.flat(2)) as Coordinate[];return {...d,points,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}})
  function districtAt(c:Coordinate) {
    const inside=districts.find(d=>c[0]>=d.bounds[0]&&c[0]<=d.bounds[2]&&c[1]>=d.bounds[1]&&c[1]<=d.bounds[3]&&booleanPointInPolygon(point(c),d.boundary))
    if(inside)return inside.id
    // Boundary rounding: assign once to nearest administrative ring vertex.
    let best:number|undefined,min=Infinity
    for(const d of districts)for(const p of d.points){const distance=(p[0]-c[0])**2*.49+(p[1]-c[1])**2;if(distance<min){min=distance;best=d.id}}
    return best
  }
  const segments:Segment[]=[], seen=new Set<string>()
  for(const w of ways) {
    const pieces:Coordinate[][]=[]
    let current:Coordinate[]=[]
    for(let i=0;i<w.coordinates.length;i++) {
      current.push(w.coordinates[i])
      if(current.length>1 && (i===w.coordinates.length-1 || (nodeUses.get(w.nodes[i])||0)>1)) {pieces.push(current);current=[w.coordinates[i]]}
    }
    const nodeAt = new Map(w.coordinates.map((c,i)=>[c.map(v=>v.toFixed(8)).join(','),`n:${w.nodes[i]}`]))
    const endpoint=(c:Coordinate)=>nodeAt.get(c.map(v=>v.toFixed(8)).join(',')) || `p:${hash(c.map(v=>v.toFixed(8)).join(',')).slice(0,14)}`
    for(const original of pieces)for(let coords of clipLine(original,raw.boundary)) {
      // Canonical orientation makes exact reversed geometries deduplicate too.
      const forward=JSON.stringify(coords),reverse=JSON.stringify([...coords].reverse())
      if(reverse<forward)coords=[...coords].reverse()
      const meters=lineLength(coords), n=Math.ceil(meters/SEGMENT_MAX_METERS)
      for(let i=0;i<n;i++) {
        const geometry=lineSliceAlong(lineString(coords),i*meters/n,(i+1)*meters/n,{units:'meters'}).geometry.coordinates.map(p=>[Number(p[0].toFixed(8)),Number(p[1].toFixed(8))] as Coordinate)
        const keyA=JSON.stringify(geometry),keyB=JSON.stringify([...geometry].reverse()),key=keyA<keyB?keyA:keyB
        if(seen.has(key))continue
        const lengthMeters=lineLength(geometry)
        if(lengthMeters<0.01)continue
        seen.add(key)
        const midpoint=along(lineString(geometry),lengthMeters/2,{units:'meters'}).geometry.coordinates as Coordinate
        const district=districtAt(midpoint)
        segments.push({footway:w.tags.footway,layer:w.tags.layer||'0',bridge:w.tags.bridge||'no',startNode:endpoint(geometry[0]),endNode:endpoint(geometry.at(-1)!),district,id:`${w.id}:${hash(key).slice(0,12)}`,osmWayId:w.id,name:w.tags.name||'',highway:w.tags.highway,access:w.tags.access,foot:w.tags.foot,coordinates:geometry,lengthMeters})
      }
    }
  }
  if(!segments.length)throw new Error('Le réseau est vide. Le fichier précédent est conservé.')
  const filtered=removeRedundantSidewalks(segments)
  return {schemaVersion:1,version,generatedAt:new Date().toISOString(),source:raw.source,sourceDate:raw.sourceDate,sourceHash,boundary:raw.boundary,districts:raw.districts,segments:filtered,totalMeters:filtered.reduce((sum,s)=>sum+s.lengthMeters,0)}
}

export function removeRedundantSidewalks(segments:Segment[]):Segment[] {
  const streetTypes=new Set(['residential','living_street','unclassified','tertiary','secondary','primary','pedestrian'])
  const sx=111195.08*Math.cos(45.76*Math.PI/180),sy=111195.08
  const xy=(c:Coordinate):Coordinate=>[(c[0]-4.83)*sx,(c[1]-45.76)*sy]
  type Edge={a:Coordinate;b:Coordinate;s:Segment}
  const grid=new Map<string,Edge[]>()
  for(const s of segments){if(!streetTypes.has(s.highway))continue;const cs=s.coordinates.map(xy);for(let i=1;i<cs.length;i++){const a=cs[i-1],b=cs[i];for(let x=Math.floor(Math.min(a[0],b[0])/30);x<=Math.floor(Math.max(a[0],b[0])/30);x++)for(let y=Math.floor(Math.min(a[1],b[1])/30);y<=Math.floor(Math.max(a[1],b[1])/30);y++){const k=`${x},${y}`;grid.set(k,[...(grid.get(k)||[]),{a,b,s}])}}}
  return segments.filter(s=>{
    if(s.footway!=='sidewalk')return true
    const a=xy(s.coordinates[0]),b=xy(s.coordinates.at(-1)!),dx=b[0]-a[0],dy=b[1]-a[1],norm=Math.hypot(dx,dy)
    if(!norm)return true
    const redundant=[.1,.5,.9].every(t=>{
      const p:Coordinate=[a[0]+dx*t,a[1]+dy*t],cx=Math.floor(p[0]/30),cy=Math.floor(p[1]/30)
      for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const e of grid.get(`${x},${y}`)||[]){
        if(e.s.layer!==s.layer||e.s.bridge!==s.bridge)continue
        const ux=e.b[0]-e.a[0],uy=e.b[1]-e.a[1],len=Math.hypot(ux,uy)
        if(!len||Math.abs(dx*ux+dy*uy)/(norm*len)<.9)continue
        const projection=((p[0]-e.a[0])*ux+(p[1]-e.a[1])*uy)/(len*len)
        if(projection<0||projection>1)continue
        if(Math.hypot(p[0]-e.a[0]-projection*ux,p[1]-e.a[1]-projection*uy)<=12)return true
      }
      return false
    })
    return !redundant
  })
}

async function main() {
  await mkdir('data',{recursive:true});await mkdir('public/data',{recursive:true});await mkdir('.osm-cache',{recursive:true})
  let raw:Raw
  if(process.argv.includes('--cached'))raw=JSON.parse(gunzipSync(await readFile(snapshotPath)).toString())
  else if(process.argv.includes('--pbf'))raw=await fallbackPbf()
  else {try{raw=await fromOverpass()}catch{raw=await fallbackPbf()}}
  if (!raw.districts?.length) {
    try { raw.districts=JSON.parse(gunzipSync(await readFile(snapshotPath)).toString()).districts } catch { /* try PBF below */ }
    if(raw.districts?.length!==9) raw=await fallbackPbf()
  }
  if(raw.districts?.length!==9)throw new Error('Les neuf arrondissements OSM sont nécessaires. Le réseau précédent a été conservé.')
  const network=prepareNetwork(raw)
  const serialized=JSON.stringify(network)
  await writeFile('.osm-cache/lyon-network.next.json',serialized)
  await writeFile(snapshotPath,gzipSync(JSON.stringify(raw)))
  await rename('.osm-cache/lyon-network.next.json','public/data/lyon-network.json')
  await writeFile('public/data/provenance.json',JSON.stringify({version:network.version,source:network.source,sourceDate:network.sourceDate,sourceHash:network.sourceHash,generatedAt:network.generatedAt,totalMeters:network.totalMeters,segments:network.segments.length,license:'ODbL 1.0',attribution:'© OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright'},null,2))
  console.log(`${network.segments.length} segments · ${(network.totalMeters/1000).toFixed(2)} km éligibles · ${(Buffer.byteLength(serialized)/1024/1024).toFixed(2)} Mo`)
}
if(process.argv[1]?.endsWith('prepare.ts') && !['install','ci','rebuild'].includes(process.env.npm_command || '')) main().catch(e=>{console.error(e.message);process.exitCode=1})
