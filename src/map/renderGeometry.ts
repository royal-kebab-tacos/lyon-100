import { lineString } from '@turf/helpers'
import lineSliceAlong from '@turf/line-slice-along'
import type { Coordinate,Coverage,Segment,Interval } from '../types'
import { mergeIntervals } from '../stats/progress'
import { stitchPaths } from './viewport'
export type MapFilter='Toutes'|'Restantes'|'Parcourues'
const part=(s:Segment,[a,b]:Interval):Coordinate[]=>a===0&&b===1?s.coordinates:lineSliceAlong(lineString(s.coordinates),a*s.lengthMeters,b*s.lengthMeters,{units:'meters'}).geometry.coordinates as Coordinate[]
/** Cache lazy slices per unit for one coverage snapshot, not per zoom/click. */
export function createRenderGeometry(coverage:Coverage){
 let previous:{segments:Segment[];excluded:Set<string>;district:number;filter:MapFilter;layers:{remaining:Coordinate[][];done:Coordinate[][];outside:Coordinate[][];removed:Coordinate[][]}}|undefined
 const cache=new Map<string,{done:Coordinate[][];remaining:Coordinate[][]}>()
 return (segments:Segment[],excluded:Set<string>,district:number,filter:MapFilter)=>{
  if(previous&&previous.excluded===excluded&&previous.district===district&&previous.filter===filter&&previous.segments.length===segments.length&&segments.every((s,i)=>s===previous!.segments[i]))return previous.layers
  const layers:{remaining:Coordinate[][];done:Coordinate[][];outside:Coordinate[][];removed:Coordinate[][]}={remaining:[],done:[],outside:[],removed:[]}
  for(const s of segments){
   if(district&&s.district!==district){layers.outside.push(s.coordinates);continue}
   if(excluded.has(s.id)){layers.removed.push(s.coordinates);continue}
   let pieces=cache.get(s.id)
   if(!pieces){
    const ranges=mergeIntervals(coverage[s.id]||[]),remaining:Coordinate[][]=[];let from=0
    for(const [a,b] of ranges){if(a>from)remaining.push(part(s,[from,a]));from=b}
    if(from<1)remaining.push(part(s,[from,1]))
    pieces={done:ranges.map(range=>part(s,range)),remaining};cache.set(s.id,pieces)
   }
   if(filter!=='Restantes')layers.done.push(...pieces.done)
   if(filter!=='Parcourues')layers.remaining.push(...pieces.remaining)
  }
  const merged={remaining:stitchPaths(layers.remaining),done:stitchPaths(layers.done),outside:stitchPaths(layers.outside),removed:stitchPaths(layers.removed)}
  previous={segments,excluded,district,filter,layers:merged};return merged
 }
}
