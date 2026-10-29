import {nearbyDeparture} from './departure'
import {createRouteRewards} from './rewards'
import {proposeLoops} from './loops'
import type {RoutingDataset} from './load'
import type {RouteRequest,RouteResponse} from './protocol'
export function runRoutingRequest(data:RoutingDataset,request:RouteRequest):RouteResponse {
 if(data.networkVersion!==request.networkVersion)throw Error('Le réseau des parcours ne correspond pas à la carte.')
 if(request.type==='locate')return {type:'departure',departure:nearbyDeparture(data.graph,request.point)}
 const started=performance.now(),rewards=createRouteRewards(data.graph,data.links,data.score,request.coverage,new Set(request.excluded),request.district),remaining=6000-(performance.now()-started)
 return {type:'loops',result:remaining>0?proposeLoops(data.graph,rewards,{start:request.start,targetMeters:request.targetMeters,maxMilliseconds:remaining,maxVisited:800000}):{status:'budget',proposals:[],visited:0,attempts:0}}
}
