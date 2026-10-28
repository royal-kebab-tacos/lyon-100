import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { lineString } from '@turf/helpers'
import lineSliceAlong from '@turf/line-slice-along'
import 'leaflet/dist/leaflet.css'
import type { Coverage, Network, Segment, TrackPoint, Interval } from '../types'
import { TILE_URL } from '../utils/config'
import { mergeIntervals } from '../stats/progress'
export type MapFilter='Toutes'|'Restantes'|'Parcourues'
interface Props {network:Network;coverage:Coverage;excluded:Set<string>;tracks:TrackPoint[][];district:number;filter:MapFilter;focusStreet:string;focusSegmentId?:string;selectedId?:string;onSelect:(s:Segment)=>void}
const latlng=(coords:number[][])=>coords.map(p=>[p[1],p[0]] as L.LatLngTuple)
const part=(s:Segment,[a,b]:Interval)=>a===0&&b===1?latlng(s.coordinates):latlng(lineSliceAlong(lineString(s.coordinates),a*s.lengthMeters,b*s.lengthMeters,{units:'meters'}).geometry.coordinates)
function NetworkLayer({network,coverage,excluded,district,filter,selectedId,onSelect}:Props){
  const map=useMap()
  useEffect(()=>{
    const renderer=L.canvas({padding:.3}),group=L.layerGroup().addTo(map)
    const remaining:L.LatLngTuple[][]=[],done:L.LatLngTuple[][]=[],outside:L.LatLngTuple[][]=[],removed:L.LatLngTuple[][]=[]
    for(const s of network.segments){
      if(district&&s.district!==district){outside.push(latlng(s.coordinates));continue}
      if(excluded.has(s.id)){removed.push(latlng(s.coordinates));continue}
      const ranges=mergeIntervals(coverage[s.id]||[])
      if(filter!=='Restantes')for(const range of ranges)done.push(part(s,range))
      if(filter!=='Parcourues'){
        let from=0
        for(const [a,b] of ranges){if(a>from)remaining.push(part(s,[from,a]));from=b}
        if(from<1)remaining.push(part(s,[from,1]))
      }
    }
    // Four canvas paths rather than one Leaflet object per 10 m unit.
    const line=(paths:L.LatLngTuple[][],options:L.PolylineOptions)=>{if(paths.length)L.polyline(paths,{renderer,interactive:false,...options}).addTo(group)}
    line(outside,{color:'#758c84',weight:1,opacity:.12})
    line(remaining,{color:'#87968e',weight:2.3,opacity:.8})
    line(removed,{color:'#b98c83',weight:2,opacity:.6,dashArray:'3 4'})
    line(done,{color:'#007b55',weight:4,opacity:1})
    const selected=network.segments.find(s=>s.id===selectedId)
    if(selected)line([latlng(selected.coordinates)],{color:'#376ecc',weight:7,opacity:.9})
    return ()=>{group.remove();renderer.remove()}
  },[map,network,coverage,excluded,district,filter,selectedId])
  useEffect(()=>{
    const select=(event:L.LeafletMouseEvent)=>{
      const point=map.latLngToContainerPoint(event.latlng),bounds=map.getBounds().pad(.05)
      let best:Segment|undefined,distance=14
      for(const s of network.segments){
        if(district&&s.district!==district)continue
        if(!s.coordinates.some(c=>bounds.contains([c[1],c[0]])))continue
        const cs=latlng(s.coordinates).map(c=>map.latLngToContainerPoint(c))
        for(let i=1;i<cs.length;i++){const d=L.LineUtil.pointToSegmentDistance(point,cs[i-1],cs[i]);if(d<distance){distance=d;best=s}}
      }
      if(best)onSelect(best)
    }
    map.on('click',select);return ()=>{map.off('click',select)}
  },[map,network,district,onSelect])
  return null
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
export function CityMap(props:Props){
  const [showTiles,setShowTiles]=useState(true),[tileError,setTileError]=useState(false)
  const center=useMemo<L.LatLngTuple>(()=>[45.7578,4.8351],[])
  return <><div className="background-toggle"><button onClick={()=>setShowTiles(v=>!v)} aria-pressed={showTiles}>{showTiles?'Masquer le fond de carte':'Afficher le fond de carte'}</button>{tileError&&showTiles&&<span>Fond de carte indisponible. Les rues restent affichées.</span>}</div><MapContainer center={center} zoom={13} minZoom={10} maxZoom={19} className="city-map" preferCanvas attributionControl><BoundaryLayer network={props.network}/>{showTiles&&<TileLayer url={TILE_URL} eventHandlers={{tileerror:()=>setTileError(true)}} attribution=""/>}<OSMAttribution/><NetworkLayer {...props}/><Focus network={props.network} district={props.district} focusStreet={props.focusStreet}/><TraceLayer tracks={props.tracks}/><FocusSegment network={props.network} id={props.focusSegmentId}/></MapContainer></>
}
function BoundaryLayer({network}:{network:Network}){const map=useMap();useEffect(()=>{const layer=L.geoJSON(network.boundary,{style:{color:'#9eaf95',weight:1.5,dashArray:'5 5',fillColor:'#f2f5ec',fillOpacity:.15},interactive:false}).addTo(map);return()=>{layer.remove()}},[network,map]);return null}
function OSMAttribution(){const map=useMap();useEffect(()=>{const text='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';map.attributionControl.addAttribution(text);return()=>{map.attributionControl.removeAttribution(text)}},[map]);return null}

function FocusSegment({network,id}:{network:Network;id?:string}){const map=useMap();useEffect(()=>{const s=network.segments.find(s=>s.id===id);if(s)map.fitBounds(L.latLngBounds(latlng(s.coordinates)),{padding:[60,60],maxZoom:18})},[map,network,id]);return null}
