import {it,expect,vi} from 'vitest'
import {createRouteClient} from '../src/routing/client'
const request={type:'locate' as const,point:[4.8,45.7] as [number,number],networkVersion:'v'}
const result={type:'departure',departure:null}
function setup(){
 const workers:Array<{onmessage:((e:{data:unknown})=>void)|null;onerror:(()=>void)|null;postMessage:ReturnType<typeof vi.fn>;terminate:ReturnType<typeof vi.fn>}>=[]
 const factory=vi.fn(()=>{const worker={onmessage:null,onerror:null,postMessage:vi.fn(),terminate:vi.fn()};workers.push(worker);return worker as unknown as Worker})
 return {client:createRouteClient(factory),workers,factory}
}
it('reuses a loaded worker and ignores stale messages and errors after success',async()=>{
 const {client,workers,factory}=setup(),progress=vi.fn(),first=client.request(request,progress),w=workers[0]
 w.onmessage!({data:{id:1,progress:20}});expect(progress).toHaveBeenCalledWith('Chargement des parcours : 20 %')
 w.onmessage!({data:{id:1,result}});await expect(first).resolves.toEqual(result);expect(()=>w.onerror!()).not.toThrow()
 const second=client.request(request,progress)
 w.onmessage!({data:{id:1,result:{wrong:true}}});w.onmessage!({data:{id:2,result}})
 await expect(second).resolves.toEqual(result);expect(factory).toHaveBeenCalledTimes(1);client.cancel()
})
it('terminates cancellation, rejects pending work and replaces the worker',async()=>{
 const {client,workers,factory}=setup(),first=client.request(request,vi.fn()),rejected=expect(first).rejects.toMatchObject({name:'AbortError'})
 const old=workers[0].onmessage;client.cancel();await rejected;expect(workers[0].terminate).toHaveBeenCalledOnce()
 const second=client.request(request,vi.fn());old!({data:{id:1,result:{wrong:true}}})
 workers[1].onmessage!({data:{id:3,result}});await expect(second).resolves.toEqual(result);expect(factory).toHaveBeenCalledTimes(2);client.cancel()
})
it('bounds downloads and recovers from worker failures',async()=>{
 vi.useFakeTimers()
 try{const {client,workers}=setup(),first=client.request(request,vi.fn()),rejected=expect(first).rejects.toThrow('trop de temps')
 await vi.advanceTimersByTimeAsync(90000);await rejected;expect(workers[0].terminate).toHaveBeenCalledOnce()
 const second=client.request(request,vi.fn()),failed=expect(second).rejects.toThrow('interrompu');workers[1].onerror!();await failed
 }finally{vi.useRealTimers()}
})
