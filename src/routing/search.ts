import type { RoutingGraph, RoutingEdge } from './types'
export interface SearchBudget { maxMeters:number; maxVisited:number; maxMilliseconds:number; signal?:AbortSignal }
export type SearchResult = {status:'found';meters:number;steps:{edgeId:string;reverse:boolean}[];visited:number}|{status:'unreachable'|'budget'|'cancelled'|'incomplete-data'|'invalid-node';visited:number}
interface Arc { to:string; edge:RoutingEdge; reverse:boolean }
interface Entry {node:string;meters:number}
class MinHeap {
 private items:Entry[]=[]
 get size(){return this.items.length}
 push(value:Entry){let i=this.items.length;this.items.push(value);while(i>0){const p=(i-1)>>1;if(this.items[p].meters<=value.meters)break;this.items[i]=this.items[p];i=p}this.items[i]=value}
 pop(){const first=this.items[0],last=this.items.pop()!;if(this.items.length){let i=0;while(2*i+1<this.items.length){let c=2*i+1;if(c+1<this.items.length&&this.items[c+1].meters<this.items[c].meters)c++;if(this.items[c].meters>=last.meters)break;this.items[i]=this.items[c];i=c}this.items[i]=last}return first}
}
/** Reusable index; no mutation of the score, activities or graph. No proximity
 * snapping: callers must supply actual graph nodes. Geometry remains on edges. */
export function createRoutingSearch(graph:RoutingGraph) {
 const adjacency=new Map<string,Arc[]>()
 for(const edge of graph.edges){
  if(!Number.isFinite(edge.meters)||edge.meters<=0||!graph.nodes[edge.from]||!graph.nodes[edge.to])throw Error('Invalid routing edge')
  if(edge.forward)adjacency.set(edge.from,[...(adjacency.get(edge.from)||[]),{to:edge.to,edge,reverse:false}])
  if(edge.backward)adjacency.set(edge.to,[...(adjacency.get(edge.to)||[]),{to:edge.from,edge,reverse:true}])
 }
 const probe=(start:string,end:string,budget:SearchBudget):SearchResult=>{
  if(!graph.nodes[start]||!graph.nodes[end])return {status:'invalid-node',visited:0}
  if(!Number.isFinite(budget.maxMeters)||budget.maxMeters<=0||!Number.isInteger(budget.maxVisited)||budget.maxVisited<=0||!Number.isFinite(budget.maxMilliseconds)||budget.maxMilliseconds<=0)throw Error('A finite positive search budget is required')
  const deadline=performance.now()+budget.maxMilliseconds,queue=new MinHeap(),best=new Map([[start,0]]),previous=new Map<string,{node:string;arc:Arc}>()
  let visited=0,clipped=false
  queue.push({node:start,meters:0})
  while(queue.size){
   if(budget.signal?.aborted)return {status:'cancelled',visited}
   if(visited>=budget.maxVisited||performance.now()>=deadline)return {status:'budget',visited}
   const current=queue.pop()
   if(current.meters!==best.get(current.node))continue
   visited++
   if(current.node===end){
    const steps:{edgeId:string;reverse:boolean}[]=[];let cursor=end
    while(cursor!==start){const prev=previous.get(cursor)!;steps.push({edgeId:prev.arc.edge.id,reverse:prev.arc.reverse});cursor=prev.node}
    return {status:'found',meters:current.meters,steps:steps.reverse(),visited}
   }
   for(const arc of adjacency.get(current.node)||[]){
    const meters=current.meters+arc.edge.meters
    if(meters>budget.maxMeters){clipped=true;continue}
    if(meters>=(best.get(arc.to)??Infinity))continue
    best.set(arc.to,meters);previous.set(arc.to,{node:current.node,arc});queue.push({node:arc.to,meters})
   }
  }
  return {status:clipped?'budget':'unreachable',visited}
 }
 return {
  /** Diagnostic only: useful to measure incomplete snapshots; not a route offer. */
  probe,
  route:(start:string,end:string,budget:SearchBudget):SearchResult=>graph.audit.missing.length?{status:'incomplete-data',visited:0}:probe(start,end,budget),
 }
}
