import type { Coordinate, Network } from '../types'
export type Tags = Record<string,string>
export interface RoutingWay { id:string; tags:Tags; nodes:string[]; coordinates:Coordinate[] }
export interface RoutingRelation { id:string; tags:Tags; members:{type:'node'|'way'|'relation';ref:string;role:string}[] }
/** Fields are absent in the legacy score snapshot. Empty and absent are different. */
export interface RoutingSource { source:string; sourceDate:string; boundary:Network['boundary']; ways:RoutingWay[]; nodeTags?:Record<string,Tags>; relations?:RoutingRelation[] }
export interface RoutingEdge { id:string; from:string; to:string; wayId:string; name:string; highway:string; layer:string; bridge:string; tunnel:string; coordinates:Coordinate[]; meters:number; forward:boolean; backward:boolean }
export interface RoutingGraph { schemaVersion:1; sourceHash:string; nodes:Record<string,Coordinate>; edges:RoutingEdge[]; audit:{ missing:string[]; excludedWays:number; blockedNodes:number; restrictedWays:number; boundaryEdgesOmitted:number; components:number; largestComponentNodes:number; rawEdges:number } }
