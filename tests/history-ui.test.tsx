import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ProgressHistory } from '../src/components/ProgressHistory'
import { buildHistory } from '../src/stats/history'
import type { Activity, Correction, Network } from '../src/types'
const network={segments:[{id:'a',district:1,lengthMeters:100}]} as Network
const activities=[{id:'a',date:'2026-10-01T12:00:00Z',importedAt:'2026-10-03T12:00:00Z',segmentIds:['a'],coverage:{a:[[0,.5]]}}] as Activity[]
const corrections:Correction[]=[]
const workers:TestWorker[]=[]
class TestWorker {
  onmessage:((e:{data:unknown})=>void)|null=null
  onerror:(()=>void)|null=null
  stopped=false
  constructor(){workers.push(this)}
  postMessage(data:{segments:Network['segments'];activities:Activity[];excluded:string[]}) {
    queueMicrotask(()=>{if(!this.stopped)this.onmessage?.({data:{result:buildHistory(data.segments,data.activities,data.excluded)}})})
  }
  terminate(){this.stopped=true}
}
const container=document.createElement('div');document.body.append(container)
let root=createRoot(container)
afterEach(async()=>{await act(async()=>root.unmount());root=createRoot(container);vi.unstubAllGlobals();workers.length=0})
it('renders existing history, switches district without another worker, and recalculates after deletion',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('Worker',TestWorker)
  await act(async()=>root.render(<ProgressHistory network={network} activities={activities} corrections={corrections} district={0}/>))
  expect(container.textContent).toContain('50 %')
  expect(container.querySelector('svg')).not.toBeNull()
  expect(workers).toHaveLength(1)
  await act(async()=>root.render(<ProgressHistory network={network} activities={activities} corrections={corrections} district={1}/>))
  expect(container.textContent).toContain('Lyon 1');expect(workers).toHaveLength(1)
  await act(async()=>root.render(<ProgressHistory network={network} activities={[]} corrections={corrections} district={1}/>))
  expect(container.textContent).toContain('Importez une sortie')
  expect(container.querySelector('svg')).toBeNull();expect(workers).toHaveLength(2)
})
it('provides a readable retry action if a worker cannot start',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  vi.stubGlobal('Worker',class {constructor(){throw new Error('blocked')}})
  await act(async()=>root.render(<ProgressHistory network={network} activities={activities} corrections={corrections} district={0}/>))
  expect(container.textContent).toContain('Vos sorties sont conservées')
  vi.stubGlobal('Worker',TestWorker)
  await act(async()=>container.querySelector('button')!.click())
  expect(container.textContent).toContain('50 %')
  expect(container.textContent).not.toContain('Impossible de calculer')
})
