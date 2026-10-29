import {it,expect,vi} from 'vitest'
import type {RoutingGraph} from '../src/routing/types'
const mock=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('../src/routing/load',()=>({loadRoutingDataset:mock.load}))
it('loads once, associates responses with requests and reports mismatched networks',async()=>{
 const scope={postMessage:vi.fn(),onmessage:null as null|((event:{data:unknown})=>Promise<void>)}
 vi.stubGlobal('self',scope)
 const graph:RoutingGraph={schemaVersion:1,sourceHash:'g',nodes:{},edges:[],audit:{missing:[],excludedWays:0,blockedNodes:0,restrictedWays:0,boundaryEdgesOmitted:0,components:0,largestComponentNodes:0,rawEdges:0}}
 mock.load.mockResolvedValue({schemaVersion:1,networkVersion:'v',graph,links:{sourceHash:'g',byEdge:{},linkedSegments:0,linkedMeters:0},score:[]})
 try {
  await import('../src/routing/loops.worker')
  const request={type:'generate',networkVersion:'v',start:'none',targetMeters:5000,coverage:{},excluded:[],district:0}
  await scope.onmessage!({data:{id:1,request}})
  expect(scope.postMessage).toHaveBeenLastCalledWith({id:1,result:{type:'loops',result:expect.objectContaining({status:'invalid-start'})}})
  await scope.onmessage!({data:{id:2,request:{...request,networkVersion:'wrong'}}})
  expect(scope.postMessage).toHaveBeenLastCalledWith({id:2,error:expect.any(String)})
  expect(mock.load).toHaveBeenCalledTimes(1)
 } finally {vi.unstubAllGlobals()}
})
