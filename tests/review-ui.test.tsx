import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach,it,expect,vi } from 'vitest'
import { ReviewPanel } from '../src/components/ReviewPanel'
import type { Activity, Network } from '../src/types'
vi.mock('dexie-react-hooks',()=>({useLiveQuery:()=>({value:[]})}))
const segment={id:'a',name:'Rue test',lengthMeters:10},network={segments:[segment]} as Network
const activity={id:'activity',name:'Sortie test',tracks:[],segmentIds:[]} as unknown as Activity
let root:ReturnType<typeof createRoot>|undefined
const container=document.createElement('div');document.body.append(container)
afterEach(async()=>{await act(async()=>root?.unmount());vi.unstubAllGlobals()})
class TestWorker {
 onmessage:((e:{data:unknown})=>void)|null=null
 postMessage(){queueMicrotask(()=>this.onmessage?.({data:{result:{suggestions:[{segmentId:'a',reason:'parallel',distance:5}],truncated:false}}}))}
 terminate(){}
}
it('shows diagnostic evidence and routes choices through callbacks, never automatically',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('Worker',TestWorker)
 const inspect=vi.fn(),decide=vi.fn();root=createRoot(container)
 await act(async()=>root!.render(<ReviewPanel activity={activity} network={network} corrections={[]} busy={false} onInspect={inspect} onDecide={decide} onReset={()=>{}} onClose={()=>{}}/>))
 expect(container.textContent).toContain('Deux voies parallèles')
 expect(decide).not.toHaveBeenCalled()
 const button=(label:string)=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)!
 await act(async()=>button('Comparer sur la carte').click());expect(inspect).toHaveBeenCalledWith(segment)
 await act(async()=>button('Ignorer').click());expect(decide).toHaveBeenCalledWith(segment,'ignore')
 await act(async()=>button('Je l’ai parcourue').click());expect(decide).toHaveBeenCalledWith(segment,'include')
})
it('hides portions that already have a manual correction',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('Worker',TestWorker);root=createRoot(container)
 await act(async()=>root!.render(<ReviewPanel activity={activity} network={network} corrections={[{segmentId:'a',action:'remove',updatedAt:'',networkVersion:''}]} busy={false} onInspect={()=>{}} onDecide={()=>{}} onReset={()=>{}} onClose={()=>{}}/>))
 expect(container.textContent).toContain('Aucune suggestion en attente')
 expect(container.querySelector('.review-row')).toBeNull()
})

it('hides resolved offsets but retains parallel-road doubts',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 class OffsetWorker extends TestWorker {override postMessage(){queueMicrotask(()=>this.onmessage?.({data:{result:{suggestions:[{segmentId:'a',reason:'offset',distance:20}],truncated:false}}}))}}
 vi.stubGlobal('Worker',OffsetWorker);root=createRoot(container)
 const covered={...activity,coverage:{a:[[0,1]]}} as Activity
 await act(async()=>root!.render(<ReviewPanel activity={covered} network={network} corrections={[]} busy={false} onInspect={()=>{}} onDecide={()=>{}} onReset={()=>{}} onClose={()=>{}}/>))
 expect(container.querySelector('.review-row')).toBeNull()
 vi.stubGlobal('Worker',TestWorker)
 await act(async()=>root!.render(<ReviewPanel activity={{...covered}} network={network} corrections={[]} busy={false} onInspect={()=>{}} onDecide={()=>{}} onReset={()=>{}} onClose={()=>{}}/>))
 expect(container.textContent).toContain('Deux voies parallèles')
})

it('filters missing portions by district and hides those resolved by other sessions',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 class MissingWorker extends TestWorker {override postMessage(){queueMicrotask(()=>this.onmessage?.({data:{result:{suggestions:[{segmentId:'a',reason:'unmatched',distance:2}],truncated:false}}}))}}
 vi.stubGlobal('Worker',MissingWorker);root=createRoot(container)
 const net={segments:[{...segment,district:2}]} as Network,props={activity,network:net,corrections:[],busy:false,onInspect:vi.fn(),onDecide:vi.fn(),onReset:vi.fn(),onClose:vi.fn()}
 await act(async()=>root!.render(<ReviewPanel {...props} coverage={{}}/>))
 expect(container.textContent).toContain('La trace longe cette petite portion')
 const selects=container.querySelectorAll('select')
 await act(async()=>{selects[1].value='1';selects[1].dispatchEvent(new Event('change',{bubbles:true}))})
 expect(container.querySelector('.review-row')).toBeNull()
 await act(async()=>{selects[1].value='2';selects[1].dispatchEvent(new Event('change',{bubbles:true}))})
 expect(container.querySelector('.review-row')).not.toBeNull()
 await act(async()=>{selects[0].value='parallel';selects[0].dispatchEvent(new Event('change',{bubbles:true}))})
 expect(container.querySelector('.review-row')).toBeNull()
 await act(async()=>{selects[0].value='all';selects[0].dispatchEvent(new Event('change',{bubbles:true}))})
 await act(async()=>root!.render(<ReviewPanel {...props} coverage={{a:[[0,1]]}}/>))
 expect(container.querySelector('.review-row')).toBeNull();expect(props.onDecide).not.toHaveBeenCalled()
})
