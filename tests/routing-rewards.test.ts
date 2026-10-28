import {it,expect} from 'vitest'
import {linkRoutingScore,createRouteRewards} from '../src/routing/rewards'
import {describeLoop,proposeLoops} from '../src/routing/loops'
import type {RoutingGraph,RoutingEdge} from '../src/routing/types'
import type {Coordinate,Segment} from '../src/types'
const sx=111195.08*Math.cos(45.76*Math.PI/180),sy=111195.08
const p=(x:number,y=0):Coordinate=>[4.83+x/sx,45.76+y/sy]
const edge=(id:string,from:string,to:string,coords:Coordinate[],meters=10):RoutingEdge=>({id,from,to,coordinates:coords,wayId:id,name:id,meters,forward:true,backward:true,highway:'footway',layer:'0',bridge:'no',tunnel:'no'})
const graph=(edges:RoutingEdge[]):RoutingGraph=>({schemaVersion:1,sourceHash:'hash',nodes:Object.fromEntries(edges.flatMap(e=>[[e.from,e.coordinates[0]],[e.to,e.coordinates.at(-1)!]])),edges,audit:{missing:[],excludedWays:0,blockedNodes:0,restrictedWays:0,boundaryEdgesOmitted:0,components:1,largestComponentNodes:2,rawEdges:edges.length}})
const segment=(id:string,wayId:string,a:number,b:number,y=0):Segment=>({id,osmWayId:wayId,coordinates:[p(a,y),p(b,y)],lengthMeters:Math.abs(b-a),name:'Rue',highway:'footway',layer:'0',bridge:'no',district:1})
it('maps partial reversed geometry to longitudinal score fractions',()=>{
 const g=graph([edge('r','a','b',[p(8),p(2)],6)]),s=segment('s','r',0,10),links=linkRoutingScore(g,[s])
 expect(links.byEdge.r[0].ranges[0][0]).toBeCloseTo(.2);expect(links.byEdge.r[0].ranges[0][1]).toBeCloseTo(.8)
 expect(links.linkedMeters).toBeCloseTo(6)
 const rewards=createRouteRewards(g,links,[s],{s:[[0,.4]]},new Set())
 expect(rewards.evaluate(['r','r'])).toBeCloseTo(4)
})
it('does not transfer score to another way, parallel path, level or changed geometry',()=>{
 const g=graph([edge('r','a','b',[p(0),p(10)])])
 const base=segment('s','r',0,10)
 for(const s of [{...base,osmWayId:'other'},segment('s','r',0,10,1),{...base,layer:'1'},{...base,bridge:'yes'},segment('s','r',20,30)])expect(linkRoutingScore(g,[s]).linkedMeters).toBe(0)
})
it('unions overlaps across route edges and respects corrections, exclusions and districts',()=>{
 const e=edge('r','a','b',[p(0),p(10)]),g=graph([e,{...e,id:'duplicate'}]),s=segment('s','r',0,10),links=linkRoutingScore(g,[s])
 expect(createRouteRewards(g,links,[s],{},new Set()).evaluate(['r','duplicate'])).toBeCloseTo(10)
 expect(createRouteRewards(g,links,[s],{s:[[0,1]]},new Set()).evaluate(['r'])).toBe(0)
 expect(createRouteRewards(g,links,[s],{},new Set(['s'])).evaluate(['r'])).toBe(0)
 expect(createRouteRewards(g,links,[s],{},new Set(),2).evaluate(['r'])).toBe(0)
 expect(()=>createRouteRewards(g,{...links,sourceHash:'wrong'},[s],{},new Set())).toThrow()
})
it('preserves fractions across bent geometry and leaves inputs unchanged',()=>{
 const e=edge('r','a','b',[p(0),p(5),p(5,5)]),s={...segment('s','r',0,10),coordinates:e.coordinates},g=graph([e]),before=JSON.stringify({g,s})
 const links=linkRoutingScore(g,[s]);expect(links.linkedMeters).toBeCloseTo(10)
 expect(JSON.stringify({g,s})).toBe(before)
})
it('validates a connected return, direction and repeated distance without duplicate rewards',()=>{
 const e=edge('r','a','b',[p(0),p(10)]),g=graph([e]),s=segment('s','r',0,10),rewards=createRouteRewards(g,linkRoutingScore(g,[s]),[s],{},new Set())
 const result=describeLoop(g,'a',[{edgeId:'r',reverse:false},{edgeId:'r',reverse:true}],rewards)!
 expect(result.meters).toBe(20);expect(result.newMeters).toBeCloseTo(10);expect(result.repeatedMeters).toBe(10);expect(result.coordinates[0]).toEqual(result.coordinates.at(-1))
 expect(describeLoop(g,'a',[{edgeId:'r',reverse:true}],rewards)).toBeNull()
 expect(describeLoop(g,'a',[{edgeId:'r',reverse:false}],rewards)).toBeNull()
 expect(describeLoop(g,'a',[{edgeId:'missing',reverse:false}],rewards)).toBeNull()
})
const square=()=>{
 const edges=[edge('1','a','b',[p(0),p(1250)],1250),edge('2','b','c',[p(1250),p(1250,1250)],1250),edge('3','c','d',[p(1250,1250),p(0,1250)],1250),edge('4','d','a',[p(0,1250),p(0)],1250)].map(e=>({...e,backward:false}))
 const g=graph(edges),segments=edges.map(e=>({...segment(e.id,e.id,0,1250),coordinates:e.coordinates})),links=linkRoutingScore(g,segments)
 return {g,segments,links,rewards:createRouteRewards(g,links,segments,{},new Set())}
}
it('proposes a closed one-way loop within length and repetition limits',()=>{
 const {g,rewards}=square(),before=JSON.stringify(g),r=proposeLoops(g,rewards,{start:'a',targetMeters:5000,maxVisited:1000,maxMilliseconds:1000})
 expect(r.status).toBe('complete');expect(r.proposals.length).toBeGreaterThan(0)
 const loop=r.proposals[0];expect(loop.meters).toBe(5000);expect(loop.repeatedMeters).toBe(0);expect(loop.newMeters).toBeCloseTo(5000);expect(JSON.stringify(g)).toBe(before)
})
it('enforces one shared visit/time budget, cancellation and incomplete input checks',()=>{
 const {g,rewards}=square(),opts={start:'a',targetMeters:5000 as const,maxVisited:1,maxMilliseconds:1000}
 expect(proposeLoops(g,rewards,opts).visited).toBeLessThanOrEqual(1)
 expect(proposeLoops(g,rewards,{...opts,maxMilliseconds:Number.MIN_VALUE}).status).toBe('budget')
 const c=new AbortController();c.abort();const cancelled=proposeLoops(g,rewards,{...opts,signal:c.signal});expect(cancelled.status).toBe('cancelled');expect(cancelled.proposals).toEqual([])
 expect(proposeLoops({...g,audit:{...g.audit,missing:['nodes']}},rewards,opts).status).toBe('incomplete-data')
 expect(proposeLoops(g,rewards,{...opts,start:'unknown'}).status).toBe('invalid-start')
})
it('does not propose exploration gains when every portion is covered',()=>{
 const {g,segments,links}=square(),rewards=createRouteRewards(g,links,segments,Object.fromEntries(segments.map(s=>[s.id,[[0,1]]])),new Set())
 expect(proposeLoops(g,rewards,{start:'a',targetMeters:5000,maxVisited:1000,maxMilliseconds:1000}).proposals).toEqual([])
})
it('rejects geometry that would draw a fabricated link despite shared node IDs',()=>{
 const {g,rewards}=square();const broken={...g,edges:g.edges.map((e,i)=>i?e:{...e,coordinates:[p(200),...e.coordinates.slice(1)]})}
 expect(describeLoop(broken,'a',g.edges.map(e=>({edgeId:e.id,reverse:false})),rewards)).toBeNull()
})
