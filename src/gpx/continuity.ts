import type {Coordinate,Interval,Segment} from '../types'
import {CONTINUITY_MAX_METERS as MAX,CONTINUITY_GPS_METERS as TOL} from '../utils/config'
export interface ContinuityRoad {segment:Segment;points:Coordinate[];cumulative:number[];length:number;start:string;end:string}
interface Anchor {road:number;t:number}
interface Piece {road:number;range:Interval}
type Adjacency=Map<string,{road:number;end:string;reverse:boolean}[]>
const distance=(a:Coordinate,b:Coordinate)=>Math.hypot(a[0]-b[0],a[1]-b[1])
function pointAt(r:ContinuityRoad,t:number):Coordinate {
 const d=t*r.length;let i=1
 while(i<r.points.length-1&&r.cumulative[i]<d)i++
 const a=r.points[i-1],b=r.points[i],f=(d-r.cumulative[i-1])/Math.max(1e-9,r.cumulative[i]-r.cumulative[i-1])
 return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]
}
function nearest(p:Coordinate,line:Coordinate[]){
 let best=Infinity,along=0,offset=0
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],length=distance(a,b)
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/Math.max(1e-9,length*length)))
  const d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
  if(d<best){best=d;along=offset+t*length}offset+=length
 }
 return {distance:best,along}
}
/** A bounded, unique real-network connection, supported by the intervening GPS.
 * No geometric snapping, no global filling between activities, no name-only merge. */
export function bridgeGap(roads:ContinuityRoad[],adj:Adjacency,a:Anchor,b:Anchor,trace:Coordinate[]):Piece[]{
 const first=roads[a.road],last=roads[b.road],name=first.segment.name.normalize('NFC').trim(),level=first.segment.layer||'0'
 const endName=last.segment.name.normalize('NFC').trim()
 const allowed=(r:ContinuityRoad)=>r.segment.connector||[name,endName].includes(r.segment.name.normalize('NFC').trim())
 if(trace.length<2)return []
 const travel=trace.slice(1).reduce((n,p,i)=>n+distance(trace[i],p),0)
 if(travel>60||travel<1)return []
 const limit=Math.min(MAX,travel*1.5+8),paths:Piece[][]=[]
 let visits=0,exhausted=false
 const supported=(pieces:Piece[])=>{
  const route:Coordinate[]=[]
  for(const piece of pieces){const r=roads[piece.road],[from,to]=piece.range,steps=Math.max(1,Math.ceil(Math.abs(to-from)*r.length/3));for(let j=0;j<=steps;j++)route.push(pointAt(r,from+(to-from)*j/steps))}
  const routeLength=route.slice(1).reduce((sum,p,i)=>sum+distance(route[i],p),0)
  if(routeLength<travel*.5-8)return false
  let previous=-Infinity
  for(const p of route){const q=nearest(p,trace);if(q.distance>TOL||q.along<previous-4)return false;previous=Math.max(previous,q.along)}
  // Reject a shortcut if the actual trace clearly took another branch.
  return trace.every(p=>nearest(p,route).distance<=TOL)
 }
 if(a.road===b.road){const pieces:Piece[]=[{road:a.road,range:[a.t,b.t]}];return Math.abs(a.t-b.t)*first.length<=limit&&supported(pieces)?pieces:[]}
 function walk(node:string,length:number,pieces:Piece[],used:Set<number>){
  if(++visits>200){exhausted=true;return}
  if(length>limit||paths.length>1)return
  if(node===last.start||node===last.end){const from=node===last.start?0:1,total=length+Math.abs(b.t-from)*last.length,next:Piece[]=[...pieces,{road:b.road,range:[from,b.t]}];if(total<=limit&&supported(next))paths.push(next);return}
  for(const edge of adj.get(node)||[]){
   if(edge.road===b.road||used.has(edge.road))continue
   const r=roads[edge.road];if(length+r.length>limit||r.points.some(p=>nearest(p,trace).distance>TOL))continue
   walk(edge.end,length+r.length,[...pieces,{road:edge.road,range:edge.reverse?[1,0]:[0,1]}],new Set([...used,edge.road]))
  }
 }
 walk(first.start,a.t*first.length,[{road:a.road,range:[a.t,0]}],new Set([a.road]))
 walk(first.end,(1-a.t)*first.length,[{road:a.road,range:[a.t,1]}],new Set([a.road]))
 if(exhausted||paths.length!==1||!paths[0].every(p=>allowed(roads[p.road])))return []
 const path=paths[0],crossing=path.some(p=>roads[p.road].segment.connector)
 // An explicit public crossing may connect two names or the end of a bridge;
 // this is traversal of real shared OSM nodes, never fusion of the two streets.
 if(!crossing&&(name!==endName||path.some(p=>(roads[p.road].segment.layer||'0')!==level)))return []
 return path
}
