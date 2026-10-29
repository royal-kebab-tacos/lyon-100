import type {Coordinate} from '../types'
import type {RoutingEdge,RoutingGraph} from './types'
import type {RouteStep} from './loops'
import {lineLength} from '../utils/geometry'
export interface ElevationData {schemaVersion:1;sourceHash:string;source:string;retrievedAt:string;values:Record<string,number|null>}
export interface Relief {up:number;down:number;knownMeters:number;totalMeters:number;profile:{meters:number;elevation:number|null}[]}
export const elevationKey=(p:Coordinate)=>`${p[0].toFixed(6)},${p[1].toFixed(6)}`
/** Sample geometry at <=25m, preserving junctions. Never use terrain under a bridge/tunnel. */
export function sampleEdge(edge:RoutingEdge){
 const samples:{coordinates:Coordinate;meters:number}[]=[{coordinates:edge.coordinates[0],meters:0}];let meters=0
 for(let i=1;i<edge.coordinates.length;i++){
  const a=edge.coordinates[i-1],b=edge.coordinates[i],length=lineLength([a,b]),n=Math.max(1,Math.ceil(length/25))
  for(let j=1;j<=n;j++)samples.push({coordinates:[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],meters:meters+length*j/n})
  meters+=length
 }
 return samples
}
export function edgeRelief(edge:RoutingEdge,data?:ElevationData):Relief{
 const supported=!!data&&edge.bridge==='no'&&edge.tunnel==='no'
 const profile=sampleEdge(edge).map(p=>({meters:p.meters,elevation:supported?(data.values[elevationKey(p.coordinates)]??null):null}))
 let up=0,down=0,knownMeters=0,anchor:number|null=null
 for(let i=0;i<profile.length;i++){
  const p=profile[i],previous=profile[i-1]
  if(p.elevation===null){anchor=null;continue}
  if(previous?.elevation!==null&&previous)knownMeters+=p.meters-previous.meters
  if(anchor===null){anchor=p.elevation;continue}
  // A 1m hysteresis reduces tiny terrain noise; retain net endpoint change.
  const delta=p.elevation-anchor
  if(Math.abs(delta)>=1||i===profile.length-1){up+=Math.max(0,delta);down+=Math.max(0,-delta);anchor=p.elevation}
 }
 return {up,down,knownMeters,totalMeters:edge.meters,profile}
}
export function createReliefIndex(graph:RoutingGraph,data?:ElevationData){
 if(data&&data.sourceHash!==graph.sourceHash)throw Error('Altitudes incompatibles avec le réseau piéton.')
 return new Map(graph.edges.map(e=>[e.id,edgeRelief(e,data)]))
}
export function routeRelief(steps:RouteStep[],index:Map<string,Relief>):Relief{
 let up=0,down=0,knownMeters=0,totalMeters=0;const profile:Relief['profile']=[]
 for(const step of steps){const r=index.get(step.edgeId);if(!r)continue
  const points=step.reverse?[...r.profile].reverse().map(p=>({...p,meters:r.profile.at(-1)!.meters-p.meters})):r.profile
  profile.push(...points.map(p=>({...p,meters:totalMeters+p.meters})))
  up+=step.reverse?r.down:r.up;down+=step.reverse?r.up:r.down;knownMeters+=r.knownMeters;totalMeters+=r.totalMeters
 }
 return {up,down,knownMeters,totalMeters,profile}
}
