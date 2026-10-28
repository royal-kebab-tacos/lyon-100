import {it,expect,vi} from 'vitest'
import type {RoutingGraph} from '../src/routing/types'
it('keeps worker responses associated with their request and reports bad links',async()=>{
 const scope:{postMessage:ReturnType<typeof vi.fn>;onmessage:((event:{data:unknown})=>void)|null}={postMessage:vi.fn(),onmessage:null}
 vi.stubGlobal('self',scope)
 try {
  await import('../src/routing/loops.worker')
  const graph:RoutingGraph={schemaVersion:1,sourceHash:'g',nodes:{},edges:[],audit:{missing:[],excludedWays:0,blockedNodes:0,restrictedWays:0,boundaryEdgesOmitted:0,components:0,largestComponentNodes:0,rawEdges:0}}
  const data={id:'request-1',graph,links:{sourceHash:'g',byEdge:{},linkedSegments:0,linkedMeters:0},segments:[],coverage:{},excluded:[],district:0,options:{start:'none',targetMeters:5000,maxMilliseconds:1000,maxVisited:100}}
  scope.onmessage!({data});expect(scope.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({id:'request-1',result:expect.objectContaining({status:'invalid-start'})}))
  scope.onmessage!({data:{...data,id:'request-2',links:{...data.links,sourceHash:'wrong'}}});expect(scope.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({id:'request-2',error:expect.any(String)}))
 } finally {vi.unstubAllGlobals()}
})
