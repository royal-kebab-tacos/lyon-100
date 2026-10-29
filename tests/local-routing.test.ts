import {it,expect} from 'vitest'
import {proposeLocalLoops} from '../src/routing/localLoops'
import {createRouteRewards,createRewardPlanner,linkRoutingScore} from '../src/routing/rewards'
import {createScope} from '../src/routing/scope'
import {createReliefIndex,edgeRelief,elevationKey,routeRelief,sampleEdge} from '../src/routing/relief'
import type {ElevationData,Relief} from '../src/routing/relief'
import type {Coordinate,Segment,District} from '../src/types'
import type {RoutingGraph,RoutingEdge} from '../src/routing/types'
const sx=111195.08*Math.cos(45.76*Math.PI/180),sy=111195.08,p=(x:number,y:number):Coordinate=>[4.83+x/sx,45.76+y/sy]
function grid(){
 const nodes:RoutingGraph['nodes']={},edges:RoutingEdge[]=[]
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)nodes[`${x},${y}`]=p((x-2)*40,(y-2)*40)
 const add=(a:string,b:string)=>edges.push({id:`e${edges.length}`,from:a,to:b,wayId:`w${edges.length}`,name:'Rue',coordinates:[nodes[a],nodes[b]],meters:40,highway:'residential',forward:true,backward:true,layer:'0',bridge:'no',tunnel:'no'})
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){if(x<4)add(`${x},${y}`,`${x+1},${y}`);if(y<4)add(`${x},${y}`,`${x},${y+1}`)}
 const graph:RoutingGraph={schemaVersion:1,sourceHash:'g',nodes,edges,audit:{missing:[],excludedWays:0,blockedNodes:0,restrictedWays:0,boundaryEdgesOmitted:0,components:1,largestComponentNodes:25,rawEdges:edges.length}}
 const segments:Segment[]=edges.map(e=>({id:e.id,osmWayId:e.wayId,coordinates:e.coordinates,lengthMeters:e.meters,name:e.name,highway:e.highway,district:1}))
 const links=linkRoutingScore(graph,segments),coverage={},excluded=new Set<string>(),rewards=createRouteRewards(graph,links,segments,coverage,excluded)
 const options={start:'2,2',targetMeters:5000 as const,maxMilliseconds:2000,maxVisited:50000,scope:{type:'circle' as const,center:p(0,0),radius:150},districts:[],avoidHills:false,relief:new Map<string,Relief>(),planner:()=>createRewardPlanner(links,segments,coverage,excluded)}
 return {graph,segments,links,rewards,options}
}
it('quadrills a nearby grid, allows short revisits and returns shorter instead of padding distance',()=>{
 const {graph,rewards,options}=grid(),before=JSON.stringify(graph),r=proposeLocalLoops(graph,rewards,options)
 expect(r.proposals.length).toBeGreaterThan(0);const loop=r.proposals[0]
 expect(new Set(loop.steps.map(s=>s.edgeId)).size).toBeGreaterThan(25)
 expect(loop.shorter).toBe(true);expect(loop.meters).toBeLessThan(3000);expect(loop.newMeters).toBeGreaterThan(1000)
 expect(loop.repeatedMeters).toBeGreaterThan(0);expect(loop.outsideMeters).toBe(0)
 expect(loop.coordinates[0]).toEqual(loop.coordinates.at(-1));expect(JSON.stringify(graph)).toBe(before)
})
it('respects cancellation, budget, incomplete data and an outside departure',()=>{
 const {graph,rewards,options}=grid(),signal=AbortSignal.abort()
 expect(proposeLocalLoops(graph,rewards,{...options,signal})).toMatchObject({status:'cancelled',proposals:[]})
 expect(proposeLocalLoops(graph,rewards,{...options,maxVisited:1})).toMatchObject({status:'budget'})
 expect(proposeLocalLoops({...graph,audit:{...graph.audit,missing:['restrictions']}},rewards,options).status).toBe('incomplete-data')
 expect(proposeLocalLoops(graph,rewards,{...options,scope:{type:'circle',center:p(5000,0),radius:100}}).status).toBe('outside-scope')
})
it('excludes long excursions even when their endpoints lie inside the circle',()=>{
 const {graph}=grid(),scope=createScope({type:'circle',center:p(0,0),radius:100})
 const edge={...graph.edges[0],coordinates:[p(0,0),p(500,0),p(0,0)],meters:1000}
 expect(scope.edge(edge)).toBeNull();expect(scope.allows(p(125,0))).toBe(true);expect(scope.allows(p(140,0))).toBe(false)
})
it('uses actual district boundaries and a limited margin',()=>{
 const district:District={id:1,name:'1er',boundary:{type:'Polygon',coordinates:[[p(-100,-100),p(100,-100),p(100,100),p(-100,100),p(-100,-100)]]}}
 const scope=createScope({type:'district',district:1},[district])
 expect(scope.contains(p(50,50))).toBe(true);expect(scope.contains(p(120,0))).toBe(false)
 expect(scope.allows(p(200,0))).toBe(true);expect(scope.allows(p(300,0))).toBe(false)
 expect(()=>createScope({type:'district',district:9},[district])).toThrow()
})
it('does not reward overlapping links or excluded/already covered portions again',()=>{
 const {links,segments}=grid(),first=segments[0].id
 links.byEdge.duplicate=links.byEdge[first]
 const planner=createRewardPlanner(links,segments,{},new Set())
 expect(planner.gain(first)).toBeCloseTo(40);planner.visit(first);expect(planner.gain('duplicate')).toBe(0)
 expect(createRewardPlanner(links,segments,{},new Set([first])).gain(first)).toBe(0)
 expect(createRewardPlanner(links,segments,{[first]:[[0,1]]},new Set()).gain(first)).toBe(0)
 expect(createRewardPlanner(links,segments,{},new Set(),2).gain(first)).toBe(0)
})
it('samples intermediate hills, reverses ascent/descent and marks terrain under bridges unknown',()=>{
 const {graph}=grid(),edge={...graph.edges[0],meters:100,coordinates:[p(0,0),p(100,0)]},points=sampleEdge(edge)
 const data:ElevationData={schemaVersion:1,sourceHash:'g',source:'synthetic',retrievedAt:'2026-10-29',values:Object.fromEntries(points.map((point,i)=>[elevationKey(point.coordinates),[100,110,120,110,105][i]]))}
 const relief=edgeRelief(edge,data);expect(relief.up).toBe(20);expect(relief.down).toBe(15)
 const reverse=routeRelief([{edgeId:edge.id,reverse:true}],new Map([[edge.id,relief]]));expect(reverse.up).toBe(15);expect(reverse.down).toBe(20)
 expect(edgeRelief({...edge,bridge:'yes'},data).knownMeters).toBe(0)
 expect(edgeRelief(edge).profile.every(p=>p.elevation===null)).toBe(true)
 expect(()=>createReliefIndex(graph,{...data,sourceHash:'wrong'})).toThrow()
})
it('only includes actual directional paths that return to the start',()=>{
 const {graph,rewards,options}=grid()
 // All streets point east/north: no non-empty return is possible.
 graph.edges.forEach(e=>e.backward=false)
 expect(proposeLocalLoops(graph,rewards,options).proposals).toEqual([])
})
it('changes route choice for relief, not only the displayed D+',()=>{
 const {graph,segments,links,options}=grid()
 // Right half has equally eligible roads but much more ascent.
 const relief=new Map(graph.edges.map(e=>[e.id,{up:e.coordinates.some(c=>c[0]>4.83)?35:0,down:0,knownMeters:e.meters,totalMeters:e.meters,profile:[]}]))
 const rewards=createRouteRewards(graph,links,segments,{},new Set())
 const flat=proposeLocalLoops(graph,rewards,{...options,relief,avoidHills:true}),any=proposeLocalLoops(graph,rewards,{...options,relief,avoidHills:false})
 expect(flat.proposals.length).toBeGreaterThan(0);expect(flat.proposals[0].relief!.up).toBeLessThan(any.proposals[0].relief!.up)
})
it('unknown altitude is explicit and never silently counted as flat',()=>{
 const {graph,rewards,options}=grid(),r=proposeLocalLoops(graph,rewards,{...options,relief:createReliefIndex(graph),avoidHills:true})
 expect(r.proposals[0].relief!.knownMeters).toBe(0)
 expect(r.proposals[0].relief!.profile.every(p=>p.elevation===null)).toBe(true)
})
