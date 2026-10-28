import { describe,it,expect } from 'vitest'
import { createViewportIndex,stitchPaths } from '../src/map/viewport'
import { createRenderGeometry } from '../src/map/renderGeometry'
import type { Segment,Coordinate } from '../src/types'
import { lineLength } from '../src/utils/geometry'
const a:Coordinate=[4.83,45.75],b:Coordinate=[4.8301,45.75],c:Coordinate=[4.8302,45.75]
const road=(id:string,coordinates:Coordinate[],district=1):Segment=>({id,coordinates,district,name:id,osmWayId:id,highway:'residential',lengthMeters:lineLength(coordinates)})
const length=(paths:Coordinate[][])=>paths.reduce((sum,p)=>sum+lineLength(p),0)
describe('visible map geometry',()=>{
 it('finds crossing lines even when both endpoints lie outside the viewport',()=>{
  const crossing=road('cross',[[4.82,45.75],[4.84,45.75]]),far=road('far',[[4.9,45.8],[4.91,45.8]])
  expect(createViewportIndex([crossing,far]).query({west:4.829,east:4.831,south:45.749,north:45.751}).map(s=>s.id)).toEqual(['cross'])
 })
 it('never returns a unit twice across grid cells and handles empty/outside views',()=>{
  const index=createViewportIndex([road('long',[[4.82,45.74],[4.85,45.77]])])
  expect(index.query({west:4.8,east:4.86,south:45.7,north:45.8})).toHaveLength(1)
  expect(index.query({west:5,east:5.01,south:46,north:46.01})).toEqual([])
 })
 it('joins exact endpoints in either direction without bridging a small gap',()=>{
  const paths=[[a,b],[c,b]];const before=JSON.stringify(paths)
  const merged=stitchPaths(paths);expect(merged).toHaveLength(1);expect(length(merged)).toBeCloseTo(length(paths),8);expect(JSON.stringify(paths)).toBe(before)
  expect(stitchPaths([[a,b],[[b[0]+1e-9,b[1]],c]])).toHaveLength(2)
 })
 it('preserves junctions, loops, and every edge exactly once',()=>{
  const d:Coordinate=[4.8301,45.7501],paths=[[a,b],[b,c],[b,d]]
  expect(stitchPaths(paths)).toHaveLength(3)
  const loop=[[a,b],[b,c],[c,a]];expect(length(stitchPaths(loop))).toBeCloseTo(length(loop),8)
 })
 it('preserves partial green and remaining distances across repeated redraws',()=>{
  const s=road('a',[a,b]),render=createRenderGeometry({a:[[.2,.7]]}),excluded=new Set<string>()
  const first=render([s],excluded,0,'Toutes'),second=render([s],excluded,0,'Toutes')
  expect(second).toEqual(first);expect(length(first.done)).toBeCloseTo(s.lengthMeters*.5,3);expect(length(first.remaining)).toBeCloseTo(s.lengthMeters*.5,3)
  expect(render([s],excluded,0,'Restantes').done).toEqual([])
  expect(render([s],excluded,0,'Parcourues').remaining).toEqual([])
 })
 it('keeps exclusions and out-of-district geometry distinct from green',()=>{
  const segments=[road('a',[a,b]),road('b',[b,c],2)],render=createRenderGeometry({a:[[0,1]],b:[[0,1]]})
  const layers=render(segments,new Set(['a']),1,'Toutes')
  expect(layers.done).toEqual([]);expect(layers.removed).toEqual([[a,b]]);expect(layers.outside).toEqual([[b,c]])
 })
 it('matches exhaustive bounding-box selection on a synthetic grid',()=>{
  const segments=Array.from({length:500},(_,i)=>road(String(i),[[4.8+(i%25)*.001,45.7+Math.floor(i/25)*.001],[4.8005+(i%25)*.001,45.7003+Math.floor(i/25)*.001]]))
  const index=createViewportIndex(segments)
  for(let i=0;i<10;i++){
   const box={west:4.8+i*.001,east:4.804+i*.001,south:45.7+i*.001,north:45.704+i*.001}
   const expected=segments.filter(s=>Math.min(...s.coordinates.map(p=>p[0]))<=box.east&&Math.max(...s.coordinates.map(p=>p[0]))>=box.west&&Math.min(...s.coordinates.map(p=>p[1]))<=box.north&&Math.max(...s.coordinates.map(p=>p[1]))>=box.south)
   expect(index.query(box).map(s=>s.id).sort()).toEqual(expected.map(s=>s.id).sort())
  }
 })
})
