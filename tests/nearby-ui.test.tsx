import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { it, expect, vi } from 'vitest'
import { NearbyPanel, type NearbyProps } from '../src/map/NearbyPanel'
import type { Network, Segment } from '../src/types'

it('chooses, locates, clears and refreshes the nearby results without modifying coverage',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const segment:Segment={id:'a',osmWayId:'a',name:'Rue test',highway:'residential',lengthMeters:8,coordinates:[[4.83,45.76],[4.8301,45.76]]}
 const container=document.createElement('div'),root=createRoot(container)
 const props:NearbyProps={network:{segments:[segment]} as Network,coverage:{},excluded:new Set(),district:0,center:null,radius:500,picking:false,onPick:vi.fn(),onClear:vi.fn(),onRadius:vi.fn(),onLocate:vi.fn()}
 const render=async(p:Partial<NearbyProps>={})=>{await act(async()=>root.render(<NearbyPanel {...props} {...p}/>))}
 const click=async(label:string)=>{await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)!.click())}
 try {
  await render();await click('Choisir sur la carte');expect(props.onPick).toHaveBeenCalledOnce()
  await render({center:[4.83,45.76]});expect(container.textContent).toContain('Rue test');expect(container.textContent).toContain('vol d’oiseau')
  await click('Voir');expect(props.onLocate).toHaveBeenCalledWith(segment)
  const select=container.querySelector('select')!;await act(async()=>{select.value='1000';select.dispatchEvent(new Event('change',{bubbles:true}))});expect(props.onRadius).toHaveBeenCalledWith(1000)
  await click('Effacer le point');expect(props.onClear).toHaveBeenCalledOnce()
  await render({center:[4.83,45.76],coverage:{a:[[0,1]]}});expect(container.textContent).toContain('Aucune portion restante')
  await render({picking:true});expect(container.textContent).toContain('Touchez la carte');expect(container.querySelector('ol')).toBeNull()
  expect(props.coverage).toEqual({})
 } finally { await act(async()=>root.unmount());vi.unstubAllGlobals() }
})
