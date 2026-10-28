import {describe,it,expect} from 'vitest'
import {prepareRouting} from '../scripts/prepare-routing'
import {walkingDirections,blockedWalkingNode} from '../src/routing/access'
import {createRoutingSearch} from '../src/routing/search'
import type {RoutingSource,RoutingWay,Tags} from '../src/routing/types'
import type {Coordinate} from '../src/types'
const coords:Record<string,Coordinate>={a:[4.83,45.75],b:[4.8301,45.75],c:[4.8302,45.75],d:[4.8301,45.7501]}
const way=(id:string,nodes:string[],tags:Tags={}):RoutingWay=>({id,nodes,coordinates:nodes.map(n=>coords[n]),tags:{highway:'footway',...tags}})
const source=(ways:RoutingWay[],extra:Partial<RoutingSource>={}):RoutingSource=>({source:'synthetic',sourceDate:'2026-10-28',boundary:{type:'Polygon',coordinates:[[[4.82,45.74],[4.84,45.74],[4.84,45.76],[4.82,45.76],[4.82,45.74]]]},ways,nodeTags:{},relations:[],...extra})
const budget={maxMeters:1000,maxVisited:100,maxMilliseconds:1000}
describe('walking permissions distinct from scoring',()=>{
 it('rejects sidepath carriageways and retains sidewalks and crossings',()=>{
  expect(walkingDirections({highway:'primary',foot:'use_sidepath'})).toBeNull()
  expect(walkingDirections({highway:'primary',sidewalk:'separate'})).toBeNull()
  expect(walkingDirections({highway:'footway',footway:'sidewalk'})).toEqual({forward:true,backward:true})
  expect(walkingDirections({highway:'footway',footway:'crossing'})).not.toBeNull()
 })
 it('resolves pedestrian permissions before general access and rejects unknown/conditional access',()=>{
  expect(walkingDirections({highway:'footway',access:'private',foot:'yes'})).not.toBeNull()
  for(const tags of ([{foot:'no'},{access:'private'},{'foot:conditional':'yes @ (Mo-Fr)'},{opening_hours:'09:00-18:00'},{motorroad:'yes'}] as Tags[]))expect(walkingDirections({highway:'residential',...tags})).toBeNull()
 })
 it('distinguishes vehicle one way, foot one way and directional foot restrictions',()=>{
  expect(walkingDirections({highway:'residential',oneway:'yes'})).toEqual({forward:true,backward:true})
  expect(walkingDirections({highway:'footway','oneway:foot':'-1'})).toEqual({forward:false,backward:true})
  expect(walkingDirections({highway:'footway','foot:backward':'no'})).toEqual({forward:true,backward:false})
  expect(walkingDirections({highway:'path',oneway:'yes'})).toBeNull()
 })
 it('blocks undocumented barriers, locked gates and restrictions but accepts explicit foot permission',()=>{
  expect(blockedWalkingNode({barrier:'gate'})).toBe(true)
  expect(blockedWalkingNode({barrier:'gate',foot:'yes'})).toBe(false)
  expect(blockedWalkingNode({barrier:'gate',foot:'yes',locked:'yes'})).toBe(true)
  expect(blockedWalkingNode({barrier:'bollard'})).toBe(false)
  expect(blockedWalkingNode({barrier:'kerb'})).toBe(false)
  expect(blockedWalkingNode({barrier:'kerb',foot:'no'})).toBe(true)
  expect(blockedWalkingNode({access:'no'})).toBe(true)
 })
})
describe('routing topology and budget',()=>{
 it('compresses geometry points while retaining the shape and distance',()=>{
  const graph=prepareRouting(source([way('1',['a','b','c'])]))
  expect(graph.edges).toHaveLength(1);expect(graph.edges[0].coordinates).toHaveLength(3)
  const result=createRoutingSearch(graph).route('a','c',budget)
  expect(result.status).toBe('found');if(result.status==='found')expect(result.meters).toBeCloseTo(graph.edges[0].meters)
 })
 it('preserves shared junctions and actual bridge landing nodes',()=>{
  const graph=prepareRouting(source([way('1',['a','b','c'],{layer:'1',bridge:'yes'}),way('2',['b','d'],{layer:'0'})]))
  expect(graph.edges).toHaveLength(3);expect(createRoutingSearch(graph).route('a','d',budget).status).toBe('found')
 })
 it('never joins distinct OSM nodes at identical coordinates or crossing levels',()=>{
  const other={...way('2',['b','d']),nodes:['different-b','d']}
  const graph=prepareRouting(source([way('1',['a','b','c'],{layer:'1',bridge:'yes'}),other]))
  expect(createRoutingSearch(graph).route('a','d',budget).status).toBe('unreachable');expect(graph.audit.components).toBe(2)
 })
 it('blocks a barrier in the middle of an otherwise compressible way',()=>{
  const graph=prepareRouting(source([way('1',['a','b','c'])],{nodeTags:{b:{barrier:'gate',access:'private'}}}))
  expect(graph.edges).toHaveLength(0)
 })
 it('retains direction and identifies disconnected or out-of-budget requests',()=>{
  const graph=prepareRouting(source([way('1',['a','b','c'],{'oneway:foot':'yes'}),way('2',['d','d'])])),search=createRoutingSearch(graph)
  expect(search.route('c','a',budget).status).toBe('unreachable')
  expect(search.route('a','c',{...budget,maxMeters:1}).status).toBe('budget')
  expect(search.route('a','c',{...budget,maxVisited:1}).status).toBe('budget')
  expect(search.route('x','c',budget).status).toBe('invalid-node')
  const controller=new AbortController();controller.abort();expect(search.route('a','c',{...budget,signal:controller.signal}).status).toBe('cancelled')
 })
 it('does not treat absent barrier/relation metadata as a verified empty set',()=>{
  const graph=prepareRouting(source([way('1',['a','b'])],{nodeTags:undefined,relations:undefined})),search=createRoutingSearch(graph)
  expect(graph.audit.missing).toHaveLength(2);expect(search.route('a','b',budget).status).toBe('incomplete-data');expect(search.probe('a','b',budget).status).toBe('found')
 })
 it('conservatively removes ways affected by explicit pedestrian turn restrictions',()=>{
  const relation={id:'r',tags:{type:'restriction','restriction:foot':'no_left_turn'},members:[{type:'way' as const,ref:'1',role:'from'}]}
  expect(prepareRouting(source([way('1',['a','b'])],{relations:[relation]})).edges).toHaveLength(0)
  expect(prepareRouting(source([way('1',['a','b'])],{relations:[{...relation,tags:{...relation.tags,except:'foot'}}]})).edges).toHaveLength(1)
 })
 it('rejects inconsistent node coordinates and omits edges leaving Lyon',()=>{
  const w=way('2',['b','c']);w.coordinates=[[4.831,45.75],coords.c]
  expect(()=>prepareRouting(source([way('1',['a','b']),w]))).toThrow('Inconsistent')
  const outside=way('3',['a','b']);outside.coordinates=[coords.a,[4.85,45.75]]
  const graph=prepareRouting(source([outside]));expect(graph.edges).toHaveLength(0);expect(graph.audit.boundaryEdgesOmitted).toBe(1)
 })
 it('does not mutate the source',()=>{
  const raw=source([way('1',['a','b','c'])]),before=JSON.stringify(raw);prepareRouting(raw);expect(JSON.stringify(raw)).toBe(before)
 })
})

it('finds the shorter alternative and reconstructs reversed geometry edges',()=>{
 const detour=way('long',['a','d','c']),direct=way('short',['c','a'])
 const graph=prepareRouting(source([detour,direct])),result=createRoutingSearch(graph).route('a','c',budget)
 expect(result.status).toBe('found')
 if(result.status==='found'){expect(result.steps).toEqual([{edgeId:'short:0:1',reverse:true}]);expect(result.meters).toBeLessThan(graph.edges.find(e=>e.wayId==='long')!.meters)}
})
it('does not create a chord through a hole in the municipal boundary',()=>{
 const raw=source([way('cross',['a','c'])]);if(raw.boundary.type==='Polygon')raw.boundary.coordinates.push([[4.83005,45.7499],[4.83015,45.7499],[4.83015,45.7501],[4.83005,45.7501],[4.83005,45.7499]])
 expect(prepareRouting(raw).edges).toHaveLength(0)
})

it('enforces a time budget and rejects unbounded search parameters',()=>{
 const graph=prepareRouting(source([way('1',['a','b'])])),search=createRoutingSearch(graph)
 expect(search.route('a','b',{...budget,maxMilliseconds:Number.MIN_VALUE}).status).toBe('budget')
 expect(()=>search.route('a','b',{...budget,maxVisited:Infinity})).toThrow('finite positive')
})
it('retains closed loops without connecting disconnected nearby endpoints',()=>{
 const loop=way('loop',['a','b','d','a']),graph=prepareRouting(source([loop]))
 expect(graph.edges).toHaveLength(1);expect(graph.edges[0].from).toBe(graph.edges[0].to)
 expect(graph.edges[0].coordinates).toHaveLength(4)
})
