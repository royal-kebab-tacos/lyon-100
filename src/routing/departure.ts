import type {Coordinate} from '../types'
import type {RoutingGraph} from './types'
import {lineLength} from '../utils/geometry'
export interface Departure {node:string;coordinates:Coordinate;distance:number}
/** Suggest a real graph node, never insert a straight access link into a route. */
export function nearbyDeparture(graph:RoutingGraph,point:Coordinate,maxMeters=200):Departure|null{
 const incoming=new Set<string>(),outgoing=new Set<string>()
 for(const e of graph.edges){if(e.forward){outgoing.add(e.from);incoming.add(e.to)}if(e.backward){outgoing.add(e.to);incoming.add(e.from)}}
 let best:Departure|null=null
 for(const [node,coordinates] of Object.entries(graph.nodes)){
  if(!incoming.has(node)||!outgoing.has(node))continue
  const distance=lineLength([point,coordinates])
  if(distance<=maxMeters&&(!best||distance<best.distance))best={node,coordinates,distance}
 }
 return best
}
