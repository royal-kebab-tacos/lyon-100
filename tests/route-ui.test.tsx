import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {it,expect,vi} from 'vitest'
import {RoutePanel} from '../src/components/RoutePanel'
const mock=vi.hoisted(()=>({request:vi.fn(),cancel:vi.fn(),save:vi.fn()}))
vi.mock('../src/routing/client',()=>({createRouteClient:()=>mock}))
vi.mock('../src/routing/gpx',()=>({exportLoop:mock.save}))
it('loads on demand, displays and exports proposals, cancels and discards obsolete results',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const container=document.createElement('div'),root=createRoot(container)
 const props={point:[4.83,45.76] as [number,number],networkVersion:'v',coverage:{},excluded:new Set<string>(),district:0,picking:false,onPreview:vi.fn()}
 const departure={node:'a',coordinates:props.point,distance:12},loop={steps:[],coordinates:[props.point,props.point],meters:5100,newMeters:1000,repeatedMeters:200}
 const render=async(p:Partial<typeof props>={})=>{await act(async()=>root.render(<RoutePanel {...props} {...p}/>))}
 const click=async(label:string)=>{await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)!.click())}
 try{
  await render();expect(mock.request).not.toHaveBeenCalled()
  mock.request.mockResolvedValueOnce({type:'departure',departure});await click('Trouver un départ proche');expect(container.textContent).toContain('12 m à vol d’oiseau')
  mock.request.mockResolvedValueOnce({type:'loops',result:{status:'budget',proposals:[loop],visited:10,attempts:1}});await click('Générer depuis ce départ')
  expect(container.textContent).toContain('Limite de calcul atteinte');expect(props.onPreview).toHaveBeenLastCalledWith({departure,loop})
  mock.save.mockResolvedValueOnce('cancelled');await click('Exporter le GPX');expect(mock.save).toHaveBeenCalledWith(loop,'auto');expect(container.textContent).toContain('Partage annulé.')
  mock.save.mockResolvedValueOnce('downloaded');await click('Télécharger le fichier');expect(mock.save).toHaveBeenLastCalledWith(loop,'download');expect(container.textContent).toContain('Téléchargement du GPX lancé.')
  const select=container.querySelectorAll('select')[1]!;await act(async()=>{select.value='8000';select.dispatchEvent(new Event('change',{bubbles:true}))});expect(container.querySelector('ol')).toBeNull()
  let finish:(value:unknown)=>void=()=>{};mock.request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  await click('Générer depuis ce départ');expect(mock.request.mock.lastCall![0].targetMeters).toBe(8000);await click('Annuler')
  await act(async()=>finish({type:'loops',result:{status:'complete',proposals:[loop]}}));expect(container.querySelector('ol')).toBeNull();expect(container.textContent).toContain('Calcul annulé')
  await render({coverage:{a:[[0,1]]} as typeof props.coverage});expect(props.onPreview).toHaveBeenLastCalledWith(null);expect(container.textContent).toContain('Trouver un départ proche')
  mock.request.mockRejectedValueOnce(new Error('Hors connexion'));await click('Trouver un départ proche');expect(container.textContent).toContain('Hors connexion')
 }finally{await act(async()=>root.unmount());vi.unstubAllGlobals()}
})

it('invalidates routes when radius, district scope or hill preference changes',async()=>{
 vi.clearAllMocks();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const container=document.createElement('div'),root=createRoot(container),onPreview=vi.fn(),point:[number,number]=[4.83,45.76],coverage={},excluded=new Set<string>()
 const render=async(radius:number)=>{await act(async()=>root.render(<RoutePanel point={point} radius={radius} networkVersion="v" coverage={coverage} excluded={excluded} district={0} picking={false} onPreview={onPreview}/>))}
 try{
  await render(500);mock.request.mockResolvedValue({type:'departure',departure:{node:'a',coordinates:point,distance:0}})
  await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Trouver un départ proche')!.click())
  expect(container.textContent).toContain('Générer depuis ce départ')
  await render(1000);expect(container.textContent).toContain('Trouver un départ proche');expect(onPreview).toHaveBeenLastCalledWith(null)
  const zone=container.querySelector('select')!;await act(async()=>{zone.value='1';zone.dispatchEvent(new Event('change',{bubbles:true}))})
  expect(container.textContent).toContain('Choisissez un départ dans l’arrondissement')
  const checkbox=container.querySelector<HTMLInputElement>('input[type=checkbox]')!;expect(checkbox.checked).toBe(true);await act(async()=>checkbox.click());expect(checkbox.checked).toBe(false)
  expect(mock.cancel).toHaveBeenCalled()
 }finally{await act(async()=>root.unmount());vi.unstubAllGlobals()}
})
