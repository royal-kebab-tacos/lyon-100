import { describe, it, expect } from 'vitest'
import { createNearbySearch } from '../src/map/nearby'
import type { Coordinate, Segment } from '../src/types'
const center:Coordinate=[4.83,45.76], sy=111195.08, sx=sy*Math.cos(center[1]*Math.PI/180)
const point=(x:number,y=0):Coordinate=>[center[0]+x/sx,center[1]+y/sy]
const road=(id:string,a:number,b:number,name='Rue test',district=1):Segment=>({id,osmWayId:id,name,district,highway:'residential',coordinates:[point(a),point(b)],lengthMeters:b-a})
describe('nearby remaining portions',()=>{
 it('clips a crossing at the circle rather than counting its entire unit',()=>{
  const search=createNearbySearch([road('a',-10,10)])
  expect(search(center,5,{},new Set()).meters).toBeCloseTo(10,5)
 })
 it('subtracts coverage only where it intersects the circle',()=>{
  const search=createNearbySearch([road('a',0,10)])
  const r=search(center,5,{a:[[0,.3],[.2,.4]]},new Set())
  expect(r.meters).toBeCloseTo(1,5);expect(r.rows[0].distance).toBeCloseTo(4,5)
  expect(search(center,5,{a:[[0,.5]]},new Set()).meters).toBeCloseTo(0,5)
 })
 it('honours corrected coverage, exclusions, zones and ignores connectors',()=>{
  const search=createNearbySearch([road('a',0,10),road('b',0,10,'Rue B',2),{...road('c',0,10),connector:true}])
  expect(search(center,100,{a:[[0,1]]},new Set(),1).meters).toBe(0)
  expect(search(center,100,{},new Set(['a']),1).meters).toBe(0)
  expect(search(center,100,{},new Set(),2).meters).toBeCloseTo(10)
 })
 it('counts unnamed meters separately, groups names and orders by remaining proximity',()=>{
  const search=createNearbySearch([road('a',40,50),road('b',20,30),road('c',0,10,''),road('d',5,15,'Autre')])
  const result=search(center,100,{},new Set())
  expect(result.streetCount).toBe(2);expect(result.unnamedMeters).toBeCloseTo(10)
  expect(result.rows.map(r=>r.name)).toEqual(['Autre','Rue test']);expect(result.rows[1].meters).toBeCloseTo(20)
 })
 it('recomputes after removing coverage without mutating the input',()=>{
  const search=createNearbySearch([road('a',0,10)]),coverage={a:[[0,1] as [number,number]]}
  expect(search(center,100,coverage,new Set()).meters).toBe(0)
  expect(search(center,100,{},new Set()).meters).toBeCloseTo(10)
  expect(coverage).toEqual({a:[[0,1]]})
 })
 it('handles a bent polyline and empty or outside circles',()=>{
  const s={...road('a',0,20),coordinates:[point(0),point(10),point(10,10)]}
  expect(createNearbySearch([s])(center,5,{},new Set()).meters).toBeCloseTo(5,5)
  expect(createNearbySearch([s])(point(500),5,{},new Set()).rows).toEqual([])
  expect(createNearbySearch([s])(center,0,{},new Set()).meters).toBe(0)
 })
})
