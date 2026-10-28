import type { Coordinate } from '../types'
import type { RoutingGraph } from './types'
import { createRoutingSearch } from './search'
import type { createRouteRewards } from './rewards'
export interface RouteStep {edgeId:string;reverse:boolean}
export interface LoopProposal {steps:RouteStep[];coordinates:Coordinate[];meters:number;newMeters:number;repeatedMeters:number}
export interface LoopOptions {start:string;targetMeters:5000|8000|10000|15000;maxMilliseconds:number;maxVisited:number;signal?:AbortSignal}
export interface LoopResult {status:'complete'|'budget'|'cancelled'|'invalid-start'|'incomplete-data';proposals:LoopProposal[];visited:number;attempts:number}
/** Verify connectivity and walking direction before presenting any geometry.
 * Repeated physical edges add distance, but never add exploration reward twice. */
export function describeLoop(graph:RoutingGraph,start:string,steps:RouteStep[],rewards:ReturnType<typeof createRouteRewards>):LoopProposal|null {
 const edges=new Map(graph.edges.map(e=>[e.id,e])),seen=new Set<string>(),coordinates:Coordinate[]=[]
 let cursor=start,meters=0,repeatedMeters=0
 for(const step of steps){
  const e=edges.get(step.edgeId)
  if(!e||!(step.reverse?e.backward:e.forward)||(step.reverse?e.to:e.from)!==cursor)return null
  const first=e.coordinates[0],last=e.coordinates.at(-1),from=graph.nodes[e.from],to=graph.nodes[e.to]
  if(e.coordinates.length<2||!first||!last||!from||!to||first[0]!==from[0]||first[1]!==from[1]||last[0]!==to[0]||last[1]!==to[1])return null
  cursor=step.reverse?e.from:e.to;meters+=e.meters
  if(seen.has(e.id))repeatedMeters+=e.meters
  seen.add(e.id)
  const part=step.reverse?[...e.coordinates].reverse():e.coordinates
  coordinates.push(...(coordinates.length?part.slice(1):part))
 }
 if(cursor!==start||!steps.length)return null
 return {steps,coordinates,meters,repeatedMeters,newMeters:rewards.evaluate(seen)}
}
/** Bounded heuristic prototype, not an optimizer. At most 24 waypoint pairs,
 * three shortest-path legs per pair, with one shared time/visit budget. */
export function proposeLoops(graph:RoutingGraph,rewards:ReturnType<typeof createRouteRewards>,options:LoopOptions):LoopResult {
 const result:LoopResult={status:'complete',proposals:[],visited:0,attempts:0}
 if(graph.audit.missing.length)return {...result,status:'incomplete-data'}
 const start=graph.nodes[options.start]
 if(!start)return {...result,status:'invalid-start'}
 if(![5000,8000,10000,15000].includes(options.targetMeters)||!Number.isFinite(options.maxMilliseconds)||options.maxMilliseconds<=0||!Number.isInteger(options.maxVisited)||options.maxVisited<=0)throw Error('Invalid loop budget or length')
 const deadline=performance.now()+options.maxMilliseconds
 const stop=()=>{
  if(options.signal?.aborted){result.status='cancelled';result.proposals=[];return true}
  if(performance.now()>=deadline||result.visited>=options.maxVisited){result.status='budget';return true}
  return false
 }
 if(stop())return result
 const search=createRoutingSearch(graph),sx=111195.08*Math.cos(start[1]*Math.PI/180),sy=111195.08
 // Keep one promising node in each angular sector and distance band. This
 // spreads the candidates, instead of repeatedly sampling one adjacent street.
 const bins=new Map<string,{id:string;angle:number;gain:number;distance:number}>()
 for(let i=0;i<graph.edges.length;i++){
  if(i%256===0&&stop())return result
  const e=graph.edges[i],gain=rewards.edgeGains.get(e.id)||0
  if(gain<=0)continue
  for(const id of [e.from,e.to]){
   const p=graph.nodes[id],dx=(p[0]-start[0])*sx,dy=(p[1]-start[1])*sy,distance=Math.hypot(dx,dy)
   if(distance<options.targetMeters/7||distance>options.targetMeters*.42)continue
   const angle=(Math.atan2(dy,dx)+Math.PI*2)%(Math.PI*2),key=`${Math.floor(angle/(Math.PI/4))}:${distance<options.targetMeters/4?0:1}`
   const previous=bins.get(key)
   if(!previous||gain>previous.gain||gain===previous.gain&&id<previous.id)bins.set(key,{id,angle,gain,distance})
  }
 }
 const nodes=[...bins.values()].sort((a,b)=>b.gain-a.gain||a.id.localeCompare(b.id)),pairs:{a:string;b:string;rank:number}[]=[]
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j],delta=Math.abs(a.angle-b.angle),angle=Math.min(delta,2*Math.PI-delta)
  if(a.id===b.id||angle<Math.PI/4||angle>Math.PI*.85)continue
  const chord=Math.sqrt(a.distance*a.distance+b.distance*b.distance-2*a.distance*b.distance*Math.cos(angle)),perimeter=a.distance+b.distance+chord
  if(perimeter>options.targetMeters*1.15)continue
  pairs.push({a:a.id,b:b.id,rank:(a.gain+b.gain)/(1+Math.abs(perimeter-options.targetMeters*.85)/options.targetMeters)})
 }
 pairs.sort((a,b)=>b.rank-a.rank||a.a.localeCompare(b.a)||a.b.localeCompare(b.b))
 const signatures=new Set<string>()
 for(const pair of pairs.slice(0,24)){
  if(stop())break
  result.attempts++
  const visits=[options.start,pair.a,pair.b,options.start],steps:RouteStep[]=[]
  let meters=0,valid=true
  for(let i=1;i<visits.length;i++){
   if(stop()){valid=false;break}
   const remaining=options.targetMeters*1.2-meters
   if(remaining<=0){valid=false;break}
   const leg=search.route(visits[i-1],visits[i],{maxMeters:remaining,maxVisited:options.maxVisited-result.visited,maxMilliseconds:Math.max(.001,deadline-performance.now()),signal:options.signal})
   result.visited+=leg.visited
   if(leg.status!=='found'){valid=false;break}
   meters+=leg.meters;steps.push(...leg.steps)
  }
  if(!valid||meters<options.targetMeters*.8||meters>options.targetMeters*1.2)continue
  if(stop())break
  const proposal=describeLoop(graph,options.start,steps,rewards)
  if(!proposal||proposal.newMeters<=0||proposal.repeatedMeters/proposal.meters>.35)continue
  const signature=[...new Set(steps.map(s=>s.edgeId))].sort().join('|')
  if(signatures.has(signature))continue
  signatures.add(signature);result.proposals.push(proposal)
 }
 stop()
 result.proposals.sort((a,b)=>b.newMeters-a.newMeters||Math.abs(a.meters-options.targetMeters)-Math.abs(b.meters-options.targetMeters)||a.repeatedMeters-b.repeatedMeters)
 result.proposals=result.proposals.slice(0,3)
 return result
}
