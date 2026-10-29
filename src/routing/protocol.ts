import type {Coordinate,Coverage} from '../types'
import type {Departure} from './departure'
import type {LoopResult} from './loops'
export type RouteRequest = {type:'locate';networkVersion:string;point:Coordinate}|{type:'generate';networkVersion:string;start:string;targetMeters:5000|8000|10000|15000;coverage:Coverage;excluded:string[];district:number}
export type RouteResponse = {type:'departure';departure:Departure|null}|{type:'loops';result:LoopResult}
export interface RouteMessage {id:number;request:RouteRequest}
