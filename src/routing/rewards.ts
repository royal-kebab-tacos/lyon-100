import type { Coordinate, Coverage, Interval, Segment } from '../types'
import type { RoutingGraph } from './types'
import { fraction, mergeIntervals } from '../stats/progress'
export interface ScoreLink { segmentId:string; ranges:Interval[] }
export interface ScoreLinks { sourceHash:string; byEdge:Record<string,ScoreLink[]>; linkedSegments:number; linkedMeters:number }
const sx=111195.08*Math.cos(45.76*Math.PI/180),sy=111195.08
const xy=(p:Coordinate):Coordinate=>[(p[0]-4.83)*sx,(p[1]-45.76)*sy]
const distance=(a:Coordinate,b:Coordinate)=>Math.hypot(a[0]-b[0],a[1]-b[1])
/** Match only the same OSM way at the same level, with collinear geometry.
 * 20 cm absorbs coordinate rounding between snapshots, not sidewalk offsets.
 * Changed/missing geometry receives no estimated reward. Each link is an exact
 * longitudinal fraction of a score unit; no name- or proximity-based transfer. */
export function linkRoutingScore(graph:RoutingGraph,segments:Segment[]):ScoreLinks {
 const byWay=new Map<string,Segment[]>()
 for(const s of segments)if(!s.connector)byWay.set(s.osmWayId,[...(byWay.get(s.osmWayId)||[]),s])
 const byEdge:ScoreLinks['byEdge']={},union:Coverage={}
 for(const edge of graph.edges){
  const route=edge.coordinates.map(xy),links:ScoreLink[]=[]
  for(const s of byWay.get(edge.wayId)||[]){
   if((s.layer||'0')!==edge.layer||(s.bridge||'no')!==edge.bridge)continue
   const points=s.coordinates.map(xy),lengths=points.slice(1).map((p,i)=>distance(points[i],p)),total=lengths.reduce((a,b)=>a+b,0),ranges:Interval[]=[]
   if(!total)continue
   let offset=0
   for(let i=0;i<lengths.length;i++){
    const a=points[i],b=points[i+1],length=lengths[i]
    if(!length)continue
    for(let j=1;j<route.length;j++){
     const c=route[j-1],d=route[j],dx=d[0]-c[0],dy=d[1]-c[1],len=distance(c,d)
     if(!len)continue
     const cross=(p:Coordinate)=>Math.abs((p[0]-c[0])*dy-(p[1]-c[1])*dx)/len
     if(cross(a)>.2||cross(b)>.2||Math.abs((b[0]-a[0])*dx+(b[1]-a[1])*dy)/(length*len)<.9999)continue
     const u=((c[0]-a[0])*(b[0]-a[0])+(c[1]-a[1])*(b[1]-a[1]))/(length*length)
     const v=((d[0]-a[0])*(b[0]-a[0])+(d[1]-a[1])*(b[1]-a[1]))/(length*length)
     const lo=Math.max(0,Math.min(u,v)),hi=Math.min(1,Math.max(u,v))
     if(hi>lo)ranges.push([(offset+lo*length)/total,(offset+hi*length)/total])
    }
    offset+=length
   }
   const merged=mergeIntervals(ranges)
   if(merged.length){links.push({segmentId:s.id,ranges:merged});union[s.id]=mergeIntervals([...(union[s.id]||[]),...merged])}
  }
  if(links.length)byEdge[edge.id]=links
 }
 return {sourceHash:graph.sourceHash,byEdge,linkedSegments:Object.keys(union).length,linkedMeters:segments.reduce((sum,s)=>sum+s.lengthMeters*fraction(union[s.id]),0)}
}
/** Inputs are the corrected coverage and exclusion set already used by the app.
 * Route proposals never persist or mutate this coverage. */
export function createRouteRewards(graph:RoutingGraph,links:ScoreLinks,segments:Pick<Segment,'id'|'lengthMeters'|'district'|'connector'>[],coverage:Coverage,excluded:Set<string>,district=0){
 if(links.sourceHash!==graph.sourceHash)throw Error('Routing score links belong to another graph')
 const eligible=new Map(segments.filter(s=>!s.connector&&!excluded.has(s.id)&&(!district||s.district===district)).map(s=>[s.id,s]))
 const evaluate=(edgeIds:Iterable<string>)=>{
  const planned:Coverage={}
  for(const id of new Set(edgeIds))for(const link of links.byEdge[id]||[]){if(!eligible.has(link.segmentId))continue;planned[link.segmentId]=mergeIntervals([...(planned[link.segmentId]||[]),...link.ranges])}
  let newMeters=0
  for(const [id,ranges] of Object.entries(planned))newMeters+=eligible.get(id)!.lengthMeters*Math.max(0,fraction([...(coverage[id]||[]),...ranges])-fraction(coverage[id]))
  return newMeters
 }
 return {evaluate,edgeGains:new Map(graph.edges.map(e=>[e.id,evaluate([e.id])]))}
}
