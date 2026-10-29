import {nearbyDeparture} from './departure'
import {createRouteRewards,createRewardPlanner} from './rewards'
import {proposeLoops} from './loops'
import {proposeLocalLoops} from './localLoops'
import {createReliefIndex,type Relief} from './relief'
const indexes=new WeakMap<RoutingDataset,Map<string,Relief>>()
import type {RoutingDataset} from './load'
import type {RouteRequest,RouteResponse} from './protocol'
export function runRoutingRequest(data:RoutingDataset,request:RouteRequest):RouteResponse {
 if(data.networkVersion!==request.networkVersion)throw Error('Le réseau des parcours ne correspond pas à la carte.')
 if(request.type==='locate')return {type:'departure',departure:nearbyDeparture(data.graph,request.point)}
 const started=performance.now()
 if(request.scope){
  let relief=indexes.get(data);if(!relief){relief=createReliefIndex(data.graph,data.elevation);indexes.set(data,relief)}
  const zone=request.scope.type==='district'?request.scope.district:0,excluded=new Set(request.excluded)
  const rewards=createRouteRewards(data.graph,data.links,data.score,request.coverage,excluded,zone),remaining=6000-(performance.now()-started)
  return {type:'loops',result:remaining<=0?{status:'budget',proposals:[],visited:0,attempts:0}:proposeLocalLoops(data.graph,rewards,{start:request.start,targetMeters:request.targetMeters,maxMilliseconds:remaining,maxVisited:800000,scope:request.scope,districts:data.districts||[],avoidHills:request.avoidHills!==false,relief,planner:()=>createRewardPlanner(data.links,data.score,request.coverage,excluded,zone)})}
 }
 const rewards=createRouteRewards(data.graph,data.links,data.score,request.coverage,new Set(request.excluded),request.district),remaining=6000-(performance.now()-started)
 return {type:'loops',result:remaining>0?proposeLoops(data.graph,rewards,{start:request.start,targetMeters:request.targetMeters,maxMilliseconds:remaining,maxVisited:800000}):{status:'budget',proposals:[],visited:0,attempts:0}}
}
