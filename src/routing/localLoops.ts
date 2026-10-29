import type {RoutingEdge,RoutingGraph} from './types'
import type {District} from '../types'
import {createScope,type RouteScope} from './scope'
import {describeLoop,type LoopOptions,type LoopResult,type RouteStep} from './loops'
import type {createRouteRewards,createRewardPlanner} from './rewards'
import {routeRelief,type Relief} from './relief'
interface Arc {from:string;to:string;edge:RoutingEdge;reverse:boolean;outside:number}
class Queue {
 private items:{id:string;cost:number}[]=[]
 get size(){return this.items.length}
 push(item:{id:string;cost:number}){let i=this.items.length;this.items.push(item);while(i){const p=(i-1)>>1;if(this.items[p].cost<=item.cost)break;this.items[i]=this.items[p];i=p}this.items[i]=item}
 pop(){const first=this.items[0],last=this.items.pop()!;if(this.items.length){let i=0;while(2*i+1<this.items.length){let c=2*i+1;if(c+1<this.items.length&&this.items[c+1].cost<this.items[c].cost)c++;if(this.items[c].cost>=last.cost)break;this.items[i]=this.items[c];i=c}this.items[i]=last}return first}
}
export interface LocalOptions extends LoopOptions {scope:RouteScope;districts:District[];avoidHills:boolean;relief:Map<string,Relief>;planner:()=>ReturnType<typeof createRewardPlanner>}
/** Explore nearby unvisited edges, retaining a real directed return at all times.
 * Small revisits are permitted. No padding to length, invented links or far waypoint tour. */
export function proposeLocalLoops(graph:RoutingGraph,rewards:ReturnType<typeof createRouteRewards>,options:LocalOptions):LoopResult{
 const result:LoopResult={status:'complete',proposals:[],visited:0,attempts:0},deadline=performance.now()+options.maxMilliseconds
 if(graph.audit.missing.length)return {...result,status:'incomplete-data'}
 if(!graph.nodes[options.start])return {...result,status:'invalid-start'}
 if(!Number.isFinite(options.targetMeters)||options.targetMeters<=0||!Number.isFinite(options.maxMilliseconds)||options.maxMilliseconds<=0||!Number.isInteger(options.maxVisited)||options.maxVisited<=0)throw Error('Invalid local route budget')
 const stop=()=>{if(options.signal?.aborted){result.status='cancelled';result.proposals=[];return true}if(performance.now()>=deadline||result.visited>=options.maxVisited){result.status='budget';return true}return false}
 const scope=createScope(options.scope,options.districts)
 if(!scope.allows(graph.nodes[options.start]))return {...result,status:'outside-scope'}
 const adjacency=new Map<string,Arc[]>(),incoming=new Map<string,Arc[]>(),outside=new Map<string,number>()
 const add=(arc:Arc)=>{const out=adjacency.get(arc.from)||[];out.push(arc);adjacency.set(arc.from,out);const back=incoming.get(arc.to)||[];back.push(arc);incoming.set(arc.to,back)}
 for(let i=0;i<graph.edges.length;i++){
  if(i%128===0&&stop())return result
  const edge=graph.edges[i],measure=scope.edge(edge);if(!measure)continue
  outside.set(edge.id,measure.outsideMeters)
  if(edge.forward)add({from:edge.from,to:edge.to,edge,reverse:false,outside:measure.outsideMeters})
  if(edge.backward)add({from:edge.to,to:edge.from,edge,reverse:true,outside:measure.outsideMeters})
 }
 let useHillCost=false
 const cost=(a:Arc)=>{const h=options.relief.get(a.edge.id),up=h?(a.reverse?h.down:h.up):0,down=h?(a.reverse?h.up:h.down):0,unknown=h?Math.max(0,h.totalMeters-h.knownMeters):a.edge.meters
  return a.edge.meters+a.outside*8+(useHillCost?(up*12+down*3+unknown*.5):0)}
 // Reverse Dijkstra builds directed routes home, with actual metres tracked separately from effort.
 let home=new Map<string,{cost:number;meters:number;arc?:Arc}>()
 const buildHome=()=>{
  home=new Map([[options.start,{cost:0,meters:0}]])
  const queue=new Queue();queue.push({id:options.start,cost:0})
  while(queue.size){if(stop())return false;const current=queue.pop(),entry=home.get(current.id)!;if(current.cost!==entry.cost)continue;result.visited++
   for(const a of incoming.get(current.id)||[]){const value=current.cost+cost(a),meters=entry.meters+a.edge.meters;if(meters>options.targetMeters*1.1||value>=(home.get(a.from)?.cost??Infinity))continue;home.set(a.from,{cost:value,meters,arc:a});queue.push({id:a.from,cost:value})}
  }
  return true
 }
 if(!buildHome())return result
 const returnSteps=(node:string)=>{const steps:RouteStep[]=[];let cursor=node
  while(cursor!==options.start){const arc=home.get(cursor)?.arc;if(!arc||steps.length>graph.edges.length)return null;steps.push({edgeId:arc.edge.id,reverse:arc.reverse});cursor=arc.to}return steps}
 const edgeMap=new Map(graph.edges.map(e=>[e.id,e])),signatures=new Set<string>()
 const rank=(p:NonNullable<LoopResult['proposals'][number]>)=>p.newMeters-(p.outsideMeters||0)*3-(p.longRepeatedMeters||0)*.5-(options.avoidHills?((p.relief?.up||0)*12+Math.max(0,p.meters-(p.relief?.knownMeters||0))*.5):0)-Math.abs(p.meters-options.targetMeters)*.1
 for(let variant=0;variant<(options.avoidHills?6:3);variant++){
  if(stop())break
  if(variant===3){useHillCost=true;if(!buildHome())break}
  const planner=options.planner(),counts=new Map<string,number>(),steps:RouteStep[]=[];let cursor=options.start,meters=0,iterations=0
  const remember=()=>{
   const back=returnSteps(cursor);if(!back)return
   const loop=describeLoop(graph,options.start,[...steps,...back],rewards);if(!loop||loop.newMeters<=0||loop.meters>options.targetMeters*1.1||loop.meters<Math.min(200,options.targetMeters*.5))return
   let outsideMeters=0,longRepeatedMeters=0,run=0;const seen=new Set<string>()
   for(const step of loop.steps){const length=edgeMap.get(step.edgeId)!.meters;outsideMeters+=outside.get(step.edgeId)||0;if(seen.has(step.edgeId))run+=length;else{longRepeatedMeters+=Math.max(0,run-150);run=0}seen.add(step.edgeId)}
   longRepeatedMeters+=Math.max(0,run-150)
   if(outsideMeters>loop.meters*.2)return
   const signature=[...seen].sort().join('|');if(signatures.has(signature))return;signatures.add(signature)
   result.proposals.push({...loop,outsideMeters,longRepeatedMeters,shorter:loop.meters<options.targetMeters*.8,relief:routeRelief(loop.steps,options.relief)})
   if(result.proposals.length>24){result.proposals.sort((a,b)=>rank(b)-rank(a));result.proposals.length=24}
  }
  while(iterations++<1500&&meters<options.targetMeters){
   if(stop())break;result.attempts++
   const frontier=new Queue(),best=new Map([[cursor,0]]),distance=new Map([[cursor,0]]),previous=new Map<string,Arc>()
   frontier.push({id:cursor,cost:0});let candidate:{arc:Arc;score:number;effort:number}|undefined,scanned=0
   while(frontier.size&&scanned++<1600){
    if(stop())break;const current=frontier.pop();if(current.cost!==best.get(current.id))continue;if(candidate&&current.cost>candidate.effort*2+50)break;result.visited++
    for(const arc of adjacency.get(current.id)||[]){
     const d=distance.get(current.id)!+arc.edge.meters,returning=home.get(arc.to);if(!returning||meters+d+returning.meters>options.targetMeters*1.1)continue
     const times=counts.get(arc.edge.id)||0,effort=current.cost+cost(arc)*(1+times*2),gain=planner.gain(arc.edge.id)
     if(gain>.05&&times===0){
      const nearby=(adjacency.get(arc.to)||[]).reduce((sum,a)=>sum+(counts.has(a.edge.id)?0:Math.min(30,planner.gain(a.edge.id))),0)
      const jitter=1+(variant%3)*.1*Math.sin(Number.parseInt(arc.edge.id.replace(/\D/g,'').slice(-6)||'1',10)+(variant%3))
      const score=(gain+nearby*.15)*jitter/(effort+15)
      if(!candidate||score>candidate.score)candidate={arc,score,effort}
     }
     // Bound transit; never walk a long already-covered boulevard just to fill kilometres.
     if(d>600||times>=3||effort>=(best.get(arc.to)??Infinity))continue
     best.set(arc.to,effort);distance.set(arc.to,d);previous.set(arc.to,arc);frontier.push({id:arc.to,cost:effort})
    }
   }
   if(stop())break
   if(!candidate)break
   const path:Arc[]=[candidate.arc];let node=candidate.arc.from
   while(node!==cursor){const arc=previous.get(node);if(!arc||path.length>1600){path.length=0;break}path.push(arc);node=arc.from}
   if(!path.length)break
   for(const arc of path.reverse()){steps.push({edgeId:arc.edge.id,reverse:arc.reverse});counts.set(arc.edge.id,(counts.get(arc.edge.id)||0)+1);planner.visit(arc.edge.id);meters+=arc.edge.meters;cursor=arc.to}
   if(meters>=Math.min(500,options.targetMeters*.25)&&(iterations%5===0||cursor===options.start))remember()
  }
  if(result.status!=='cancelled')remember()
 }
 if(result.status==='cancelled')return result
 result.proposals.sort((a,b)=>rank(b)-rank(a))
 const selected:typeof result.proposals=[]
 for(const proposal of result.proposals){const ids=new Set(proposal.steps.map(s=>s.edgeId));if(selected.some(other=>{const otherIds=new Set(other.steps.map(s=>s.edgeId));return [...ids].filter(id=>otherIds.has(id)).length/Math.max(ids.size,otherIds.size)>.85}))continue;selected.push(proposal);if(selected.length===3)break}
 result.proposals=selected;return result
}
