import type { Coordinate, Coverage, Segment, TrackPoint } from '../types'
import { fraction } from '../stats/progress'
import { GPS_TOLERANCE_METERS } from '../utils/config'
export const DIAGNOSTIC_VERSION='1'
export const REVIEW_RADIUS_METERS=22
export const MAX_REVIEW_SUGGESTIONS=500
export interface Suggestion {segmentId:string;reason:'parallel'|'offset'|'unmatched';distance:number}
export interface IgnoredReview {activityId:string;segmentId:string;version:string}
export interface ReviewResult {suggestions:Suggestion[];truncated:boolean}
const SX=111195.08*Math.cos(45.76*Math.PI/180), SY=111195.08
const xy=(c:Coordinate):Coordinate=>[(c[0]-4.83)*SX,(c[1]-45.76)*SY]
interface Edge {segment:Segment;a:Coordinate;b:Coordinate;length:number;offset:number;total:number}
interface Candidate {edge:Edge;t:number;distance:number}
const dot=(a:Coordinate,b:Coordinate)=>a[0]*b[0]+a[1]*b[1]
const direction=(a:Coordinate,b:Coordinate):Coordinate=>[b[0]-a[0],b[1]-a[1]]
const parallel=(a:Coordinate,b:Coordinate)=>Math.abs(dot(a,b))/Math.max(1e-9,Math.hypot(...a)*Math.hypot(...b))>Math.cos(Math.PI/12)
/** Conservative hints only. Never returns coverage or changes the automatic matching. */
export function diagnose(segments:Segment[],tracks:TrackPoint[][],onProgress?:(n:number)=>void,coverage?:Coverage):ReviewResult {
  const grid=new Map<string,Edge[]>(),incompleteIds=new Set<string>()
  for(const segment of segments){
    if(coverage!==undefined&&(1-fraction(coverage[segment.id]))*segment.lengthMeters>=.5)incompleteIds.add(segment.id)
    const points=segment.coordinates.map(xy),lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0)
    let offset=0
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=lengths[i-1]
      if(!length)continue
      const edge={segment,a,b,length,offset,total};offset+=length
      for(let x=Math.floor(Math.min(a[0],b[0])/40);x<=Math.floor(Math.max(a[0],b[0])/40);x++)for(let y=Math.floor(Math.min(a[1],b[1])/40);y<=Math.floor(Math.max(a[1],b[1])/40);y++){const key=`${x},${y}`;const cell=grid.get(key)||[];cell.push(edge);grid.set(key,cell)}
    }
  }
  function candidates(p:Coordinate,heading:Coordinate){
    const edges=new Set<Edge>(),best=new Map<string,Candidate>()
    const cx=Math.floor(p[0]/40),cy=Math.floor(p[1]/40)
    for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const e of grid.get(`${x},${y}`)||[])edges.add(e)
    for(const edge of edges){
      const v=direction(edge.a,edge.b)
      if(!parallel(v,heading))continue
      const t=Math.max(0,Math.min(1,dot(direction(edge.a,p),v)/(edge.length**2)))
      const distance=Math.hypot(p[0]-edge.a[0]-v[0]*t,p[1]-edge.a[1]-v[1]*t)
      if(distance>REVIEW_RADIUS_METERS)continue
      const value={edge,t:(edge.offset+t*edge.length)/edge.total,distance},old=best.get(edge.segment.id)
      if(!old||distance<old.distance)best.set(edge.segment.id,value)
    }
    return [...best.values()].sort((a,b)=>a.distance-b.distance).slice(0,12)
  }
  const found=new Map<string,Suggestion>()
  let truncated=false,processed=0
  const totalPoints=tracks.reduce((n,t)=>n+t.length,0)
  for(const track of tracks){
    let previous=new Map<string,{candidate:Candidate;reason:Suggestion['reason'];start:number}>()
    for(let i=1;i<track.length;i++){
      const a=xy(track[i-1].coordinates),b=xy(track[i].coordinates),v=direction(a,b),length=Math.hypot(...v)
      const time=track[i-1].time&&track[i].time?(Date.parse(track[i].time!)-Date.parse(track[i-1].time!))/1000:0
      if(!length||length>200||time>120||time<0){previous.clear();continue}
      const steps=Math.max(1,Math.ceil(length/4))
      for(let step=0;step<=steps;step++){
        const p:Coordinate=[a[0]+v[0]*step/steps,a[1]+v[1]*step/steps],cs=candidates(p,v)
        const next=new Map<string,{candidate:Candidate;reason:Suggestion['reason'];start:number}>()
        for(const c of cs){
          const alternative=c.distance<=cs[0].distance+3&&cs.some(other=>other.distance<=cs[0].distance+3&&other.edge.segment.osmWayId!==c.edge.segment.osmWayId&&other.distance<=GPS_TOLERANCE_METERS&&c.distance<=GPS_TOLERANCE_METERS&&Math.abs(other.distance-c.distance)<=3&&parallel(direction(other.edge.a,other.edge.b),direction(c.edge.a,c.edge.b))&&Math.abs((other.edge.a[0]-c.edge.a[0])*(c.edge.b[1]-c.edge.a[1])-(other.edge.a[1]-c.edge.a[1])*(c.edge.b[0]-c.edge.a[0]))/c.edge.length>3)
          // A hint, never automatic coverage: a small unit closely followed by this
          // continuous trace, with no competing way of similar distance or other level.
          const segment=c.edge.segment
          const incomplete=incompleteIds.has(segment.id)
          const close=incomplete&&segment.lengthMeters<=10.1&&c.distance<=8&&(!segment.layer||segment.layer==='0')&&(!segment.bridge||segment.bridge==='no')&&!segment.connector&&!cs.some(other=>other.edge.segment.osmWayId!==segment.osmWayId&&other.distance<c.distance+3)
          const reason:Suggestion['reason']|undefined=alternative?'parallel':c.distance>GPS_TOLERANCE_METERS&&!cs.some(candidate=>candidate.distance<=GPS_TOLERANCE_METERS)?'offset':close?'unmatched':undefined
          if(!reason)continue
          const id=c.edge.segment.id,prev=previous.get(id),start=prev?.reason===reason?prev.start:c.t
          next.set(id,{candidate:c,reason,start})
          if(Math.abs(c.t-start)*c.edge.total>=Math.min(6,c.edge.total*.7)&&c.edge.total>=2){
            // Do not suggest an uncovered endpoint if the evidence only follows
            // the already covered part; require >=0.5m of supported missing length.
            const low=Math.min(start,c.t),high=Math.max(start,c.t)
            const supportedMissing=(high-low-fraction((coverage?.[id]||[]).map(([a,b])=>[Math.max(low,a),Math.min(high,b)] as [number,number]).filter(([a,b])=>b>a)))*c.edge.total
            if(reason==='unmatched'&&supportedMissing<.5)continue
            if(found.size<MAX_REVIEW_SUGGESTIONS||found.has(id)){
              if(reason!=='unmatched'||!found.has(id))found.set(id,{segmentId:id,reason,distance:c.distance})
            }
            else truncated=true
          }
        }
        previous=next
      }
      if(++processed%100===0)onProgress?.(Math.round(100*processed/Math.max(1,totalPoints)))
    }
  }
  onProgress?.(100)
  return {suggestions:[...found.values()],truncated}
}

