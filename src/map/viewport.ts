import type { Coordinate, Segment } from '../types'
export interface Bounds { west:number; south:number; east:number; north:number }
const DX=.005,DY=.004
const boundsOf=(s:Segment):Bounds=>({west:Math.min(...s.coordinates.map(p=>p[0])),east:Math.max(...s.coordinates.map(p=>p[0])),south:Math.min(...s.coordinates.map(p=>p[1])),north:Math.max(...s.coordinates.map(p=>p[1]))})
const intersects=(a:Bounds,b:Bounds)=>a.west<=b.east&&a.east>=b.west&&a.south<=b.north&&a.north>=b.south
/** Static spatial grid: both rendering and hit-testing avoid scanning the whole city. */
export function createViewportIndex(segments:Segment[]){
 const cells=new Map<string,number[]>(),bounds=segments.map(boundsOf)
 bounds.forEach((b,i)=>{for(let x=Math.floor(b.west/DX);x<=Math.floor(b.east/DX);x++)for(let y=Math.floor(b.south/DY);y<=Math.floor(b.north/DY);y++){const key=`${x},${y}`,cell=cells.get(key)||[];cell.push(i);cells.set(key,cell)}})
 return {query(box:Bounds):Segment[]{const found=new Set<number>();for(let x=Math.floor(box.west/DX);x<=Math.floor(box.east/DX);x++)for(let y=Math.floor(box.south/DY);y<=Math.floor(box.north/DY);y++)for(const i of cells.get(`${x},${y}`)||[])if(intersects(bounds[i],box))found.add(i);return [...found].sort((a,b)=>a-b).map(i=>segments[i])}}
}
const key=(p:Coordinate)=>`${p[0]},${p[1]}`
/** Join only exact shared endpoints of same-style lines; stop at junctions.
 * No rounding or bridging gaps. Input is not modified; partial endpoints stay intact. */
export function stitchPaths(paths:Coordinate[][]):Coordinate[][]{
 const edges=paths.filter(p=>p.length>=2),adj=new Map<string,number[]>(),seen=new Set<number>(),result:Coordinate[][]=[]
 edges.forEach((p,i)=>{for(const k of [key(p[0]),key(p.at(-1)!)]){const list=adj.get(k)||[];list.push(i);adj.set(k,list)}})
 function walk(index:number,start:string){const points:Coordinate[]=[];let current=index,node=start
  while(!seen.has(current)){
   seen.add(current);const source=edges[current],forward=key(source[0])===node,part=forward?source:[...source].reverse()
   points.push(...(points.length?part.slice(1):part));node=key(part.at(-1)!)
   const next=adj.get(node)!;if(next.length!==2)break
   const candidate=next.find(i=>!seen.has(i));if(candidate===undefined)break;current=candidate
  }
  result.push(points)
 }
 edges.forEach((p,i)=>{if(seen.has(i))return;const a=key(p[0]),b=key(p.at(-1)!);if(adj.get(a)!.length!==2)walk(i,a);else if(adj.get(b)!.length!==2)walk(i,b)})
 edges.forEach((p,i)=>{if(!seen.has(i))walk(i,key(p[0]))})
 return result
}
