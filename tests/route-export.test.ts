import {it,expect,vi} from 'vitest'
import {loopGpx,exportLoop} from '../src/routing/gpx'
import {nearbyDeparture} from '../src/routing/departure'
import type {LoopProposal} from '../src/routing/loops'
import type {RoutingGraph} from '../src/routing/types'
const loop:LoopProposal={steps:[],coordinates:[[4.8,45.7],[4.81,45.71],[4.8,45.7]],meters:5000,newMeters:1000,repeatedMeters:0}
it('exports the exact closed geometry as valid escaped GPX without activity timestamps',()=>{
 const xml=new DOMParser().parseFromString(loopGpx(loop,'A < B & "C"'),'application/xml')
 expect(xml.querySelector('parsererror')).toBeNull();expect(xml.querySelector('name')?.textContent).toBe('A < B & "C"')
 expect([...xml.querySelectorAll('trkpt')].map(p=>[Number(p.getAttribute('lon')),Number(p.getAttribute('lat'))])).toEqual(loop.coordinates)
 expect(xml.querySelector('time')).toBeNull();expect(()=>loopGpx({...loop,coordinates:loop.coordinates.slice(0,2)})).toThrow('incomplète')
 expect(()=>loopGpx({...loop,coordinates:[[NaN,0],[NaN,0]]})).toThrow()
})
it('does not download when the share sheet is cancelled',async()=>{
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click'),share=vi.fn().mockRejectedValue(new DOMException('Cancel','AbortError'))
 Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:share,configurable:true})
 try{await exportLoop(loop);expect(share).toHaveBeenCalledOnce();expect(click).not.toHaveBeenCalled()}finally{click.mockRestore();Reflect.deleteProperty(navigator,'canShare');Reflect.deleteProperty(navigator,'share')}
})
it('suggests only real nodes with incoming and outgoing edges within 200m',()=>{
 const graph={nodes:{a:[4.8,45.7],b:[4.801,45.7],isolated:[4.8,45.70001]},edges:[{from:'a',to:'b',forward:true,backward:false}]} as unknown as RoutingGraph
 expect(nearbyDeparture(graph,[4.8,45.7])).toBeNull()
 graph.edges[0].backward=true;expect(nearbyDeparture(graph,[4.8,45.70001])?.node).toBe('a')
 expect(nearbyDeparture(graph,[4.9,45.8])).toBeNull();expect(nearbyDeparture(graph,[4.8,45.7])?.coordinates).toEqual(graph.nodes.a)
})

it.each(['download','unsupported','broken-capability','broken-share'] as const)('downloads GPX when %s without changing its geometry',async scenario=>{
 vi.useFakeTimers()
 const share=vi.fn().mockRejectedValue(new Error('Share unavailable')),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{}),revoke=vi.fn()
 vi.stubGlobal('URL',Object.assign(class {},{createObjectURL:vi.fn(()=> 'blob:route'),revokeObjectURL:revoke}))
 Object.defineProperty(navigator,'canShare',{value:()=>{if(scenario==='broken-capability')throw Error('Unsupported');return scenario!=='unsupported'},configurable:true})
 Object.defineProperty(navigator,'share',{value:share,configurable:true})
 try{
  expect(await exportLoop(loop,scenario==='download'?'download':'auto')).toBe('downloaded')
  expect(click).toHaveBeenCalledOnce();expect(document.querySelector('a[download]')).toBeNull()
  expect(share).toHaveBeenCalledTimes(scenario==='broken-share'?1:0)
  expect(revoke).not.toHaveBeenCalled();vi.runAllTimers();expect(revoke).toHaveBeenCalledWith('blob:route')
 }finally{click.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();Reflect.deleteProperty(navigator,'canShare');Reflect.deleteProperty(navigator,'share')}
})
it('includes estimated relief and its missing coverage without inventing point elevations',()=>{
 const relief={up:38,down:38,knownMeters:4900,totalMeters:5000,profile:[]}
 const xml=new DOMParser().parseFromString(loopGpx({...loop,relief}),'application/xml')
 expect(xml.querySelector('trk desc')?.textContent).toContain('D+ estimé : 38 m')
 expect(xml.querySelector('trk desc')?.textContent).toContain('98 %')
 expect(xml.querySelector('trk desc')?.textContent).toContain('pas une activité réalisée')
 expect(xml.querySelector('ele')).toBeNull();expect(xml.querySelector('time')).toBeNull()
 expect([...xml.querySelectorAll('trkpt')].map(p=>[Number(p.getAttribute('lon')),Number(p.getAttribute('lat'))])).toEqual(loop.coordinates)
 expect(loopGpx({...loop,relief:{...relief,knownMeters:0}})).toContain('Relief indisponible')
})
it('reports a completed share without triggering a download',async()=>{
 const share=vi.fn().mockResolvedValue(undefined),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:share,configurable:true})
 try{expect(await exportLoop(loop)).toBe('shared');expect(share).toHaveBeenCalledOnce();expect(click).not.toHaveBeenCalled()}
 finally{click.mockRestore();Reflect.deleteProperty(navigator,'canShare');Reflect.deleteProperty(navigator,'share')}
})
