import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { NearbyPanel } from './NearbyPanel'
import { RoutePanel, type RoutePreview } from '../components/RoutePanel'
import 'leaflet/dist/leaflet.css'
import type { Coordinate, Coverage, Network, Segment, TrackPoint } from '../types'
import { TILE_URL } from '../utils/config'
import { createViewportIndex } from './viewport'
import { createRenderGeometry, type MapFilter } from './renderGeometry'
export type { MapFilter } from './renderGeometry'
interface Props {network:Network;coverage:Coverage;excluded:Set<string>;tracks:TrackPoint[][];district:number;filter:MapFilter;focusStreet:string;focusSegmentId?:string;selectedId?:string;onSelect:(s:Segment)=>void}
const latlng=(coords:number[][])=>coords.map(p=>[p[1],p[0]] as L.LatLngTuple)
const box=(bounds:L.LatLngBounds)=>({west:bounds.getWest(),east:bounds.getEast(),south:bounds.getSouth(),north:bounds.getNorth()})
function NetworkLayer({network,coverage,excluded,district,filter,onSelect,picking}:{picking:boolean}&Props){
  const map=useMap()
  const index=useMemo(()=>createViewportIndex([...network.segments,...(network.connectors||[])]),[network])
  const geometry=useMemo(()=>createRenderGeometry(coverage),[coverage])
  useEffect(()=>{
    const renderer=L.canvas({padding:.15}),group=L.layerGroup().addTo(map)
    const line=(options:L.PolylineOptions)=>L.polyline([],{renderer,interactive:false,smoothFactor:.5,...options}).addTo(group)
    const lines={outside:line({color:'#758c84',weight:1,opacity:.12}),remaining:line({color:'#87968e',weight:2.3,opacity:.8}),removed:line({color:'#b98c83',weight:2,opacity:.6,dashArray:'3 4'}),done:line({color:'#007b55',weight:4,opacity:1})}
    let frame=0
    const draw=()=>{frame=0;const visible=index.query(box(map.getBounds().pad(.2))),layers=geometry(visible,excluded,district,filter);for(const name of ['outside','remaining','removed','done'] as const)lines[name].setLatLngs(layers[name].map(latlng))}
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw)}
    // Let Leaflet animate the previous small set; refresh after movement settles.
    map.on('moveend zoomend resize',schedule);schedule()
    return ()=>{cancelAnimationFrame(frame);map.off('moveend zoomend resize',schedule);group.remove();renderer.remove()}
  },[map,index,geometry,excluded,district,filter])
  useEffect(()=>{
    const select=(event:L.LeafletMouseEvent)=>{
      if(picking)return
      const point=map.latLngToContainerPoint(event.latlng)
      const bounds=L.latLngBounds(map.containerPointToLatLng(point.subtract([14,14])),map.containerPointToLatLng(point.add([14,14])))
      let best:Segment|undefined,distance=14
      for(const s of index.query(box(bounds))){
        if(s.connector||(district&&s.district!==district))continue
        const cs=latlng(s.coordinates).map(c=>map.latLngToContainerPoint(c))
        for(let i=1;i<cs.length;i++){const d=L.LineUtil.pointToSegmentDistance(point,cs[i-1],cs[i]);if(d<distance){distance=d;best=s}}
      }
      if(best)onSelect(best)
    }
    map.on('click',select);return ()=>{map.off('click',select)}
  },[map,index,district,onSelect,picking])
  return null
}
function SelectionLayer({network,id}:{network:Network;id?:string}){
 const map=useMap(),byId=useMemo(()=>new Map(network.segments.map(s=>[s.id,s])),[network])
 useEffect(()=>{const s=id?byId.get(id):undefined;if(!s)return;const renderer=L.canvas({padding:.15});const line=L.polyline(latlng(s.coordinates),{renderer,color:'#376ecc',weight:7,opacity:.9,interactive:false}).addTo(map);return()=>{line.remove();renderer.remove()}},[map,byId,id]);return null
}
function Focus({network,district,focusStreet}:{network:Network;district:number;focusStreet:string}){
  const map=useMap()
  useEffect(()=>{
    if(focusStreet){const coords=network.segments.filter(s=>s.name.normalize('NFC').trim()===focusStreet).flatMap(s=>latlng(s.coordinates));if(coords.length)map.fitBounds(L.latLngBounds(coords),{padding:[30,30],maxZoom:17});return}
    const zone=network.districts?.find(d=>d.id===district)
    map.fitBounds(L.geoJSON(zone?.boundary||network.boundary).getBounds(),{padding:[20,20],maxZoom:14})
  },[map,network,district,focusStreet])
  return null
}
function TraceLayer({tracks}:{tracks:TrackPoint[][]}){
  const map=useMap()
  useEffect(()=>{if(!tracks.length)return;const layer=L.polyline(tracks.map(t=>latlng(t.map(p=>p.coordinates))),{color:'#e9824c',weight:3,opacity:.85,interactive:false}).addTo(map);map.fitBounds(layer.getBounds(),{padding:[28,28],maxZoom:16});return()=>{layer.remove()}},[tracks,map]);return null
}
export const CityMap=memo(function CityMap(props:Props){
  const [showTiles,setShowTiles]=useState(true),[tileError,setTileError]=useState(false)
  const [nearby,setNearby]=useState<Coordinate|null>(null),[radius,setRadius]=useState(500),[picking,setPicking]=useState(false),[nearbyFocus,setNearbyFocus]=useState<Segment>()
  const [routePreview,setRoutePreview]=useState<RoutePreview|null>(null)
  const preview=useCallback((value:RoutePreview|null)=>setRoutePreview(value),[])
  const center=useMemo<L.LatLngTuple>(()=>[45.7578,4.8351],[])
  return <><NearbyPanel network={props.network} coverage={props.coverage} excluded={props.excluded} district={props.district} center={nearby} radius={radius} picking={picking} onPick={()=>setPicking(v=>!v)} onClear={()=>{setNearby(null);setPicking(false);setNearbyFocus(undefined)}} onRadius={setRadius} onLocate={s=>{setNearbyFocus(s);props.onSelect(s)}}/><RoutePanel point={nearby} networkVersion={props.network.version} coverage={props.coverage} excluded={props.excluded} district={props.district} picking={picking} onPreview={preview}/><div className="map-wrap"><div className="background-toggle"><button onClick={()=>setShowTiles(v=>!v)} aria-pressed={showTiles}>{showTiles?'Masquer le fond de carte':'Afficher le fond de carte'}</button>{tileError&&showTiles&&<span>Fond de carte indisponible. Les rues restent affichées.</span>}</div><MapContainer center={center} zoom={13} minZoom={10} maxZoom={19} className="city-map" preferCanvas attributionControl><BoundaryLayer network={props.network}/>{showTiles&&<TileLayer url={TILE_URL} eventHandlers={{tileerror:()=>setTileError(true)}} attribution=""/>}<OSMAttribution/><NetworkLayer {...props} picking={picking}/><SelectionLayer network={props.network} id={props.selectedId}/><Focus network={props.network} district={props.district} focusStreet={props.focusStreet}/><TraceLayer tracks={props.tracks}/><FocusSegment network={props.network} id={props.focusSegmentId}/><NearbyLayer center={nearby} radius={radius} picking={picking} onChoose={p=>{setNearby(p);setPicking(false)}} focus={nearbyFocus}/><RouteLayer preview={routePreview}/></MapContainer></div></>
})
function BoundaryLayer({network}:{network:Network}){const map=useMap();useEffect(()=>{const layer=L.geoJSON(network.boundary,{style:{color:'#9eaf95',weight:1.5,dashArray:'5 5',fillColor:'#f2f5ec',fillOpacity:.15},interactive:false}).addTo(map);return()=>{layer.remove()}},[network,map]);return null}
function OSMAttribution(){const map=useMap();useEffect(()=>{const text='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';map.attributionControl.addAttribution(text);return()=>{map.attributionControl.removeAttribution(text)}},[map]);return null}

function FocusSegment({network,id}:{network:Network;id?:string}){const map=useMap();useEffect(()=>{const s=network.segments.find(s=>s.id===id);if(s)map.fitBounds(L.latLngBounds(latlng(s.coordinates)),{padding:[60,60],maxZoom:18})},[map,network,id]);return null}


function NearbyLayer({center,radius,picking,onChoose,focus}:{center:Coordinate|null;radius:number;picking:boolean;onChoose:(p:Coordinate)=>void;focus?:Segment}) {
 const map=useMap()
 useEffect(()=>{if(!picking)return;const click=(e:L.LeafletMouseEvent)=>onChoose([e.latlng.lng,e.latlng.lat]);map.on('click',click);const previous=map.getContainer().style.cursor;map.getContainer().style.cursor='crosshair';return()=>{map.off('click',click);map.getContainer().style.cursor=previous}},[map,picking,onChoose])
 useEffect(()=>{if(!center)return;const group=L.layerGroup().addTo(map);L.circle([center[1],center[0]],{radius,color:'#376ecc',weight:2,fillOpacity:.04,interactive:false}).addTo(group);L.circleMarker([center[1],center[0]],{radius:6,color:'#376ecc',fillOpacity:1,interactive:false}).addTo(group);return()=>{group.remove()}},[map,center,radius])
 useEffect(()=>{if(focus)map.fitBounds(L.latLngBounds(latlng(focus.coordinates)),{padding:[50,50],maxZoom:17})},[map,focus])
 return null
}

function RouteLayer({preview}:{preview:RoutePreview|null}){
 const map=useMap()
 useEffect(()=>{
  if(!preview)return
  const group=L.layerGroup().addTo(map),renderer=L.canvas({padding:.15})
  const p=preview.departure.coordinates
  L.circleMarker([p[1],p[0]],{radius:8,color:'#7023b7',fillColor:'#fff',fillOpacity:1,weight:4,interactive:false}).addTo(group)
  if(preview.loop){const path=L.polyline(latlng(preview.loop.coordinates),{renderer,color:'#7023b7',weight:5,opacity:.9,interactive:false}).addTo(group);map.fitBounds(path.getBounds(),{padding:[30,30],maxZoom:16})}
  else map.setView([p[1],p[0]],17)
  return()=>{group.remove();renderer.remove()}
 },[map,preview]);return null
}
