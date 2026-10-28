import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import {point} from '@turf/helpers'
import {clipLine} from './prepare'
import {lineLength,validCoordinate} from '../src/utils/geometry'
import {blockedWalkingNode,walkingDirections} from '../src/routing/access'
import type {RoutingGraph,RoutingSource,RoutingEdge} from '../src/routing/types'

export function prepareRouting(source:RoutingSource):RoutingGraph {
 const missing:string[]=[]
 if(!source.nodeTags)missing.push('node-tags')
 if(!source.relations)missing.push('restriction-relations')
 const blocked=new Set(Object.entries(source.nodeTags||{}).filter(([,t])=>blockedWalkingNode(t)).map(([id])=>id))
 // Until a full turn-state engine is validated, omit every way participating in
 // an explicit pedestrian restriction. This loses options, never grants a turn.
 const restricted=new Set<string>()
 for(const r of source.relations||[]){
  if(!r.tags.type?.startsWith('restriction')||(r.tags.except||'').split(';').map(x=>x.trim()).includes('foot'))continue
  if(!r.tags['restriction:foot']&&!r.tags['restriction:foot:conditional']&&r.tags.type!=='restriction:foot')continue
  for(const m of r.members)if(m.type==='way')restricted.add(m.ref);else if(m.type==='node')blocked.add(m.ref)
 }
 const rings=source.boundary.type==='Polygon'?source.boundary.coordinates.flat():source.boundary.coordinates.flat(2)
 const xs=rings.map(p=>p[0]),ys=rings.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]
 let excludedWays=0,boundaryEdgesOmitted=0,rawEdges=0
 const ways=source.ways.filter(w=>{
  const eligible=walkingDirections(w.tags)&&!restricted.has(w.id)
  if(!eligible){excludedWays++;return false}
  return !w.coordinates.every(p=>p[0]<bounds[0]||p[0]>bounds[2]||p[1]<bounds[1]||p[1]>bounds[3])
 }).sort((a,b)=>a.id.localeCompare(b.id))
 const uses=new Map<string,number>(),allCoords=new Map<string,number[]>()
 for(const w of ways){
  if(w.nodes.length!==w.coordinates.length||w.coordinates.some(p=>!validCoordinate(p)))throw Error('Invalid routing way geometry')
  for(let i=0;i<w.nodes.length;i++){
   const id=w.nodes[i],c=w.coordinates[i],previous=allCoords.get(id)
   if(previous&&(previous[0]!==c[0]||previous[1]!==c[1]))throw Error('Inconsistent coordinates for OSM node '+id)
   allCoords.set(id,c);uses.set(id,(uses.get(id)||0)+1)
  }
 }
 const nodes:RoutingGraph['nodes']={},edges:RoutingEdge[]=[]
 for(const w of ways){
  const directions=walkingDirections(w.tags)!
  let start=-1,coords:RoutingEdge['coordinates']=[]
  const flush=(end:number)=>{
   if(start>=0&&coords.length>1){
    const meters=lineLength(coords)
    if(meters>.01){const from=w.nodes[start],to=w.nodes[end];nodes[from]=w.coordinates[start];nodes[to]=w.coordinates[end];edges.push({id:`${w.id}:${start}:${end}`,from,to,wayId:w.id,name:w.tags.name||'',highway:w.tags.highway,layer:w.tags.layer||'0',bridge:w.tags.bridge||'no',tunnel:w.tags.tunnel||'no',coordinates:coords,meters,...directions})}
   }
   start=-1;coords=[]
  }
  for(let i=1;i<w.nodes.length;i++){
   const a=w.coordinates[i-1],b=w.coordinates[i]
   if(blocked.has(w.nodes[i-1])||blocked.has(w.nodes[i])){flush(i-1);continue}
   // Retain only complete original OSM edges inside Lyon. No artificial nodes,
   // endpoint snapping or connections where a bridge crosses a lower road.
   if(!booleanPointInPolygon(point(a),source.boundary)||!booleanPointInPolygon(point(b),source.boundary)){boundaryEdgesOmitted++;flush(i-1);continue}
   const clipped=clipLine([a,b],source.boundary)
   if(clipped.length!==1||Math.abs(lineLength(clipped[0])-lineLength([a,b]))>.01){boundaryEdgesOmitted++;flush(i-1);continue}
   rawEdges++
   if(start<0){start=i-1;coords=[a]}
   coords.push(b)
   if(i===w.nodes.length-1||(uses.get(w.nodes[i])||0)>1||source.nodeTags?.[w.nodes[i]])flush(i)
  }
 }
 const adjacency=new Map<string,string[]>()
 for(const e of edges){adjacency.set(e.from,[...(adjacency.get(e.from)||[]),e.to]);adjacency.set(e.to,[...(adjacency.get(e.to)||[]),e.from])}
 const seen=new Set<string>();let components=0,largestComponentNodes=0
 for(const id of Object.keys(nodes)){if(seen.has(id))continue;components++;let count=0;const queue=[id];seen.add(id);while(queue.length){const n=queue.pop()!;count++;for(const to of adjacency.get(n)||[])if(!seen.has(to)){seen.add(to);queue.push(to)}}largestComponentNodes=Math.max(largestComponentNodes,count)}
 return {schemaVersion:1,sourceHash:createHash('sha256').update(JSON.stringify(source)).digest('hex'),nodes,edges,audit:{missing,excludedWays,blockedNodes:blocked.size,restrictedWays:restricted.size,boundaryEdgesOmitted,components,largestComponentNodes,rawEdges}}
}
if(process.argv[1]?.endsWith('prepare-routing.ts')){
 const input=process.argv[2]||'data/lyon-source.json.gz',source:RoutingSource=JSON.parse(gunzipSync(readFileSync(input)).toString())
 const started=performance.now(),graph=prepareRouting(source)
 mkdirSync('.osm-cache',{recursive:true});writeFileSync('.osm-cache/routing-prototype.json',JSON.stringify(graph))
 console.log(JSON.stringify({nodes:Object.keys(graph.nodes).length,edges:graph.edges.length,buildMs:Math.round(performance.now()-started),...graph.audit},null,2))
 if(graph.audit.missing.length)console.log('Topology prototype only: missing node/relation metadata. Not suitable for navigation.')
}
