import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import {point} from '@turf/helpers'
import type {Coordinate,District} from '../types'
import type {RoutingEdge} from './types'
import {sampleEdge} from './relief'
export type RouteScope={type:'circle';center:Coordinate;radius:number}|{type:'district';district:number}
export function createScope(scope:RouteScope,districts:District[]=[]){
 if(scope.type==='circle'&&(!Number.isFinite(scope.radius)||scope.radius<100||scope.radius>5000))throw Error('Rayon de parcours invalide.')
 const district=scope.type==='district'?districts.find(d=>d.id===scope.district):undefined
 if(scope.type==='district'&&!district)throw Error('Arrondissement indisponible pour les parcours.')
 const sx=111195.08*Math.cos(45.76*Math.PI/180),sy=111195.08
 const gap=(p:Coordinate)=>{
  if(scope.type==='circle')return Math.hypot((p[0]-scope.center[0])*sx,(p[1]-scope.center[1])*sy)-scope.radius
  if(booleanPointInPolygon(point(p),district!.boundary))return -1
  let best=Infinity
  const rings=district!.boundary.type==='Polygon'?district!.boundary.coordinates:district!.boundary.coordinates.flat()
  for(const ring of rings)for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy,x=(p[0]-a[0])*sx,y=(p[1]-a[1])*sy
   const t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(x-t*dx,y-t*dy))
  }
  return best
 }
 const margin=scope.type==='circle'?Math.min(200,scope.radius*.3):150
 const points=scope.type==='circle'?[scope.center]:district!.boundary.type==='Polygon'?district!.boundary.coordinates.flat():district!.boundary.coordinates.flat(2)
 const reach=scope.type==='circle'?scope.radius+margin:margin
 const bounds=[Math.min(...points.map(p=>p[0]))-reach/sx,Math.min(...points.map(p=>p[1]))-reach/sy,Math.max(...points.map(p=>p[0]))+reach/sx,Math.max(...points.map(p=>p[1]))+reach/sy]
 return {
  contains:(p:Coordinate)=>gap(p)<=0,
  allows:(p:Coordinate)=>gap(p)<=margin,
  edge:(edge:RoutingEdge)=>{
   // Reject clearly distant edges before densification.
   if(edge.coordinates.every(p=>p[0]<bounds[0])||edge.coordinates.every(p=>p[0]>bounds[2])||edge.coordinates.every(p=>p[1]<bounds[1])||edge.coordinates.every(p=>p[1]>bounds[3]))return null
   const points=sampleEdge(edge);let outsideMeters=0
   for(let i=0;i<points.length;i++){
    if(gap(points[i].coordinates)>margin)return null
    if(i){const a=points[i-1],b=points[i],middle:Coordinate=[(a.coordinates[0]+b.coordinates[0])/2,(a.coordinates[1]+b.coordinates[1])/2]
     if(gap(middle)>0)outsideMeters+=b.meters-a.meters}
   }
   return {outsideMeters:Math.min(edge.meters,outsideMeters)}
  },
 }
}
