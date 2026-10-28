import { memo, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coverage, Network, Segment, TrackPoint } from '../types'
import { TILE_URL } from '../utils/config'
import { createViewportIndex } from './viewport'
import { createRenderGeometry, type MapFilter } from './renderGeometry'
export type { MapFilter } from './renderGeometry'
interface Props {network:Network;coverage:Coverage;excluded:Set<string>;tracks:TrackPoint[][];district:number;filter:MapFilter;focusStreet:string;focusSegmentId?:string;selectedId?:string;onSelect:(s:Segment)=>void}
const latlng=(coords:number[][])=>coords.map(p=>[p[1],p[0]] as L.LatLngTuple)
const box=(bounds:L.LatLngBounds)=>({west:bounds.getWest(),east:bounds.getEast(),south:bounds.getSouth(),north:bounds.getNorth()})
function NetworkLayer({network,coverage,excluded,district,filter,onSelect}:Props){
  const map=useMap()
  const index=useMemo(()=>createViewportIndex(network.segments),[network])
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
      const point=map.latLngToContainerPoint(event.latlng)
      const bounds=L.latLngBounds(map.containerPointToLatLng(point.subtract([14,14])),map.containerPointToLatLng(point.add([14,14])))
      let best:Segment|undefined,distance=14
      for(const s of index.query(box(bounds))){
        if(district&&s.district!==district)continue
        const cs=latlng(s.coordinates).map(c=>map.latLngToContainerPoint(c))
        for(let i=1;i<cs.length;i++){const d=L.LineUtil.pointToSegmentDistance(point,cs[i-1],cs[i]);if(d<distance){distance=d;best=s}}
      }
      if(best)onSelect(best)
    }
    map.on('click',select);return ()=>{map.off('click',select)}
  },[map,index,district,onSelect])
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
  const center=useMemo<L.LatLngTuple>(()=>[45.7578,4.8351],[])
  return <><div className="background-toggle"><button onClick={()=>setShowTiles(v=>!v)} aria-pressed={showTiles}>{showTiles?'Masquer le fond de carte':'Afficher le fond de carte'}</button>{tileError&&showTiles&&<span>Fond de carte indisponible. Les rues restent affichées.</span>}</div><MapContainer center={center} zoom={13} minZoom={10} maxZoom={19} className="city-map" preferCanvas attributionControl><BoundaryLayer network={props.network}/>{showTiles&&<TileLayer url={TILE_URL} eventHandlers={{tileerror:()=>setTileError(true)}} attribution=""/>}<OSMAttribution/><NetworkLayer {...props}/><SelectionLayer network={props.network} id={props.selectedId}/><Focus network={props.network} district={props.district} focusStreet={props.focusStreet}/><TraceLayer tracks={props.tracks}/><FocusSegment network={props.network} id={props.focusSegmentId}/></MapContainer></>
})
function BoundaryLayer({network}:{network:Network}){const map=useMap();useEffect(()=>{const layer=L.geoJSON(network.boundary,{style:{color:'#9eaf95',weight:1.5,dashArray:'5 5',fillColor:'#f2f5ec',fillOpacity:.15},interactive:false}).addTo(map);return()=>{layer.remove()}},[network,map]);return null}
function OSMAttribution(){const map=useMap();useEffect(()=>{const text='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';map.attributionControl.addAttribution(text);return()=>{map.attributionControl.removeAttribution(text)}},[map]);return null}

function FocusSegment({network,id}:{network:Network;id?:string}){const map=useMap();useEffect(()=>{const s=network.segments.find(s=>s.id===id);if(s)map.fitBounds(L.latLngBounds(latlng(s.coordinates)),{padding:[60,60],maxZoom:18})},[map,network,id]);return null}
