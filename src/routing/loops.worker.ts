import { createRouteRewards, type ScoreLinks } from './rewards'
import { proposeLoops, type LoopOptions } from './loops'
import type { RoutingGraph } from './types'
import type { Coverage, Segment } from '../types'
// Prototype worker protocol. Caller owns request identity and terminates/replaces
// this worker to cancel an in-flight synchronous calculation. No database writes.
interface Request {id:string;graph:RoutingGraph;links:ScoreLinks;segments:Segment[];coverage:Coverage;excluded:string[];district:number;options:Omit<LoopOptions,'signal'>}
self.onmessage=(event:MessageEvent<Request>)=>{
 const {id,graph,links,segments,coverage,excluded,district,options}=event.data
 try {
  const began=performance.now(),rewards=createRouteRewards(graph,links,segments,coverage,new Set(excluded),district),remaining=options.maxMilliseconds-(performance.now()-began)
  const result=remaining>0?proposeLoops(graph,rewards,{...options,maxMilliseconds:remaining}):{status:'budget',proposals:[],visited:0,attempts:0}
  self.postMessage({id,result})
 }
 catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Le calcul du parcours a échoué.'})}
}
