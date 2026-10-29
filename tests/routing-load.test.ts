import {it,expect,vi,afterEach} from 'vitest'
import {createHash} from 'node:crypto'
const mock=vi.hoisted(()=>({manifest:{networkVersion:'v',bytes:0,sourceHash:'g',sha256:'',parts:[] as {path:string;bytes:number;sha256:string}[]}}))
vi.mock('../src/routing/dataset-manifest.json',()=>({default:mock.manifest}))
import {loadRoutingDataset} from '../src/routing/load'
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const data=JSON.stringify({schemaVersion:1,networkVersion:'v',graph:{sourceHash:'g',audit:{missing:[]},edges:[{}]},links:{sourceHash:'g'},score:[]})
function setup(){
 mock.manifest.bytes=new TextEncoder().encode(data).length;mock.manifest.sha256=hash(data);mock.manifest.parts=[{path:'routing/a.txt',bytes:mock.manifest.bytes,sha256:hash(data)}]
 const cache={match:vi.fn().mockResolvedValue(undefined),put:vi.fn(),delete:vi.fn(),keys:vi.fn().mockResolvedValue([])},fetch=vi.fn().mockResolvedValue(new Response(data))
 vi.stubGlobal('caches',{open:vi.fn().mockResolvedValue(cache)});vi.stubGlobal('fetch',fetch)
 return {cache,fetch}
}
afterEach(()=>vi.unstubAllGlobals())
it('fetches verified data once, then works entirely from cache',async()=>{
 const {cache,fetch}=setup(),progress=vi.fn()
 await expect(loadRoutingDataset('v',progress)).resolves.toHaveProperty('networkVersion','v');expect(cache.put).toHaveBeenCalledOnce();expect(progress).toHaveBeenLastCalledWith(100)
 cache.match.mockResolvedValue(new Response(data));fetch.mockRejectedValue(new Error('offline'))
 await expect(loadRoutingDataset('v',progress)).resolves.toHaveProperty('networkVersion','v');expect(fetch).toHaveBeenCalledTimes(1)
})
it('repairs a corrupt cache, rejects corrupt network data and mismatched versions',async()=>{
 const {cache,fetch}=setup();cache.match.mockResolvedValue(new Response('bad'))
 await loadRoutingDataset('v',vi.fn());expect(cache.delete).toHaveBeenCalledWith('/routing/a.txt')
 cache.match.mockResolvedValue(undefined);fetch.mockResolvedValue(new Response('bad'))
 await expect(loadRoutingDataset('v',vi.fn())).rejects.toThrow('incomplètes')
 await expect(loadRoutingDataset('wrong',vi.fn())).rejects.toThrow('correspond pas')
})
it('still runs online when storage is unavailable and explains offline failure',async()=>{
 const {fetch}=setup();vi.stubGlobal('caches',{open:vi.fn().mockRejectedValue(new Error('quota'))})
 await expect(loadRoutingDataset('v',vi.fn())).resolves.toHaveProperty('networkVersion','v')
 fetch.mockRejectedValue(new Error('offline'));await expect(loadRoutingDataset('v',vi.fn())).rejects.toThrow('hors ligne')
})
