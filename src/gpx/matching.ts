import type { Coordinate, Coverage, Interval, MatchResult, Segment, TrackPoint } from '../types'
import { GPS_TOLERANCE_METERS as TOL, SAMPLE_INTERVAL_METERS as STEP, MAX_HEADING_DIFFERENCE_DEGREES, WIDE_STREET_TOLERANCE_METERS as WIDE, WIDE_STREET_MIN_FOLLOW_METERS as MIN_FOLLOW, WIDE_STREET_HEADING_DEGREES, WIDE_STREET_COMPETITOR_MARGIN_METERS as MARGIN } from '../utils/config'
import { bridgeGap } from './continuity'
import { mergeIntervals } from '../stats/progress'
// Local metric projection centred on Lyon (spherical radius used by Turf).
// Length accounting always uses the geodesic length stored in the network.
const SX=111195.08*Math.cos(45.76*Math.PI/180), SY=111195.08, CELL=40
const xy=(p:Coordinate):Coordinate=>[(p[0]-4.83)*SX,(p[1]-45.76)*SY]
const dist=(a:Coordinate,b:Coordinate)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const key=(p:Coordinate)=>p.map(x=>x.toFixed(8)).join(',')
const lerp=(a:Coordinate,b:Coordinate,t:number):Coordinate=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
function project(p:Coordinate,a:Coordinate,b:Coordinate){const dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy;const t=n?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/n)):0;return {t,d:dist(p,lerp(a,b,t))}}
interface Road {segment:Segment; points:Coordinate[]; cumulative:number[]; length:number; start:string; end:string}
interface Candidate {road:number;t:number;distance:number;heading:number;direction:Coordinate}
interface Piece {road:number;range:Interval}
interface Route {length:number;pieces:Piece[];wide?:boolean}
interface State {index:number;candidate:Candidate;score:number;previous?:State;route?:Route}
function observations(track:TrackPoint[]):Coordinate[] {
  if(track.length<2)return []
  const result:Coordinate[]=[xy(track[0].coordinates)]
  let remaining=STEP
  for(let i=1;i<track.length;i++){
    let a=xy(track[i-1].coordinates);const b=xy(track[i].coordinates);let d=dist(a,b)
    if(d>200){return []} // Parser normally splits these; never bridge hostile input.
    while(d>=remaining){a=lerp(a,b,remaining/d);result.push(a);d=dist(a,b);remaining=STEP}
    remaining-=d
    const previous=xy(track[i-1].coordinates),next=track[i+1]&&xy(track[i+1].coordinates)
    if(next){
      const ux=b[0]-previous[0],uy=b[1]-previous[1],vx=next[0]-b[0],vy=next[1]-b[1],norm=Math.hypot(ux,uy)*Math.hypot(vx,vy)
      if(norm&&(ux*vx+uy*vy)/norm<Math.cos(Math.PI/4)){
        if(dist(result.at(-1)!,b)>.05)result.push(b)
        remaining=STEP
      }
    }
  }
  const end=xy(track.at(-1)!.coordinates)
  if(dist(result.at(-1)!,end)>0.05)result.push(end)
  return result
}
export function createNetworkMatcher(segments:Segment[]) {
  const roads:Road[]=segments.map(segment=>{
    const points=segment.coordinates.map(xy),cumulative=[0]
    for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+dist(points[i-1],points[i]))
    return {segment,points,cumulative,length:cumulative.at(-1)!,start:segment.startNode||key(segment.coordinates[0]),end:segment.endNode||key(segment.coordinates.at(-1)!)}
  })
  const grid=new Map<string,number[]>(),adj=new Map<string,{road:number;end:string;reverse:boolean}[]>()
  const add=(node:string,value:{road:number;end:string;reverse:boolean})=>adj.set(node,[...(adj.get(node)||[]),value])
  roads.forEach((r,index)=>{
    const xs=r.points.map(p=>p[0]),ys=r.points.map(p=>p[1])
    for(let x=Math.floor(Math.min(...xs)/CELL);x<=Math.floor(Math.max(...xs)/CELL);x++)for(let y=Math.floor(Math.min(...ys)/CELL);y<=Math.floor(Math.max(...ys)/CELL);y++){const k=`${x},${y}`;grid.set(k,[...(grid.get(k)||[]),index])}
    add(r.start,{road:index,end:r.end,reverse:false});add(r.end,{road:index,end:r.start,reverse:true})
  })
  const order=(a:Candidate,b:Candidate)=>(a.distance+4*a.heading)-(b.distance+4*b.heading)||a.road-b.road
  function sameCorridor(a:Candidate,b:Candidate){
    const ra=roads[a.road],rb=roads[b.road],sa=ra.segment,sb=rb.segment
    if((sa.layer||'0')!==(sb.layer||'0')||(sa.bridge||'no')!==(sb.bridge||'no'))return false
    if(sa.osmWayId!==sb.osmWayId&&(!sa.name.trim()||sa.name.normalize('NFC').trim()!==sb.name.normalize('NFC').trim()))return false
    const u=a.direction,v=b.direction,delta=[rb.points[0][0]-ra.points[0][0],rb.points[0][1]-ra.points[0][1]]
    return Math.abs(u[0]*v[0]+u[1]*v[1])>Math.cos(10*Math.PI/180)&&Math.abs(delta[0]*u[1]-delta[1]*u[0])<=3
  }
  function candidates(p:Coordinate,before:Coordinate,after:Coordinate):Candidate[]{
    const indexes=new Set<number>(),cx=Math.floor(p[0]/CELL),cy=Math.floor(p[1]/CELL)
    for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const i of grid.get(`${x},${y}`)||[])indexes.add(i)
    const result:Candidate[]=[],dx=after[0]-before[0],dy=after[1]-before[1],norm=Math.hypot(dx,dy)
    for(const road of indexes){
      const r=roads[road];if(r.segment.connector)continue;let best:Candidate|undefined
      for(let i=1;i<r.points.length;i++){
        const a=r.points[i-1],b=r.points[i],q=project(p,a,b),length=dist(a,b)
        const similarity=norm&&length?Math.abs(dx*(b[0]-a[0])+dy*(b[1]-a[1]))/(norm*length):1
        if(q.d>WIDE+MARGIN||similarity<Math.cos(MAX_HEADING_DIFFERENCE_DEGREES*Math.PI/180))continue
        const c={road,t:(r.cumulative[i-1]+q.t*length)/r.length,distance:q.d,heading:1-similarity,direction:[(b[0]-a[0])/length,(b[1]-a[1])/length] as Coordinate}
        if(!best||c.distance<best.distance)best=c
      }
      if(best)result.push(best)
    }
    // Normal matching keeps its original candidates. Expanded matching is a fallback,
    // never a buffer that credits every nearby parallel line.
    const normal=result.filter(c=>c.distance<=TOL)
    if(normal.length)return normal.sort(order).slice(0,6)
    const aligned=result.filter(c=>c.distance<=WIDE&&c.heading<=1-Math.cos(WIDE_STREET_HEADING_DEGREES*Math.PI/180))
    const eligible=aligned.filter(c=>{
      const r=roads[c.road],s=r.segment
      if(!['residential','living_street','pedestrian','unclassified','tertiary','secondary','primary'].includes(s.highway))return false
      // A distinct nearby corridor (even with the same name) remains ambiguous.
      return !result.some(other=>other.road!==c.road&&other.distance<=c.distance+MARGIN&&!sameCorridor(c,other))
    })
    return eligible.sort(order).slice(0,6)
  }
  function route(a:Candidate,b:Candidate,p:Coordinate,q:Coordinate):Route|undefined {
    const ra=roads[a.road],rb=roads[b.road],travel=dist(p,q),wide=a.distance>TOL||b.distance>TOL,limit=travel+Math.max(12,travel*0.6)
    if(wide&&(!sameCorridor(a,b)||Math.abs(a.direction[0]*b.direction[0]+a.direction[1]*b.direction[1])<Math.cos(WIDE_STREET_HEADING_DEGREES*Math.PI/180)))return undefined
    if(a.road===b.road)return {wide,length:Math.abs(a.t-b.t)*ra.length,pieces:[{road:a.road,range:[a.t,b.t]}]}
    type Visit={node:string;length:number;pieces:Piece[]}
    const queue:Visit[]=[{node:ra.start,length:a.t*ra.length,pieces:[{road:a.road,range:[a.t,0]}]},{node:ra.end,length:(1-a.t)*ra.length,pieces:[{road:a.road,range:[a.t,1]}]}]
    const seen=new Map<string,number>();let best:Route|undefined;let visited=0
    while(queue.length&&visited++<150){
      queue.sort((a,b)=>b.length-a.length);const current=queue.pop()!
      if(current.length>limit||current.length>=(best?.length??Infinity)||(seen.get(current.node)??Infinity)<=current.length)continue
      seen.set(current.node,current.length)
      if(current.node===rb.start||current.node===rb.end){
        const from=current.node===rb.start?0:1,length=current.length+Math.abs(b.t-from)*rb.length
        if(length<=limit&&length<(best?.length??Infinity))best={wide,length,pieces:[...current.pieces,{road:b.road,range:[from,b.t]}]}
      }
      for(const edge of adj.get(current.node)||[]){
        if(edge.road===a.road||edge.road===b.road)continue
        const r=roads[edge.road]
        if(r.segment.connector)continue // Used only by the anchored continuity pass.
        // No invented shortcut through a remote parallel street or park detour.
        const first=r.points[0],last=r.points.at(-1)!,span=dist(first,last)
        if(wide&&(!span||!sameCorridor(a,{...a,road:edge.road,direction:[(last[0]-first[0])/span,(last[1]-first[1])/span]})))continue
        if(r.points.some(point=>project(point,p,q).d>(wide?WIDE:TOL)))continue
        queue.push({node:edge.end,length:current.length+r.length,pieces:[...current.pieces,{road:edge.road,range:edge.reverse?[1,0]:[0,1]}]})
      }
    }
    return best
  }
  return (tracks:TrackPoint[][],onProgress?:(done:number)=>void):MatchResult=>{
    const coverage:Coverage={};let done=0
    let anchors=new Map<number,Candidate>(),linked=new Set<number>()
    const total=tracks.reduce((sum,t)=>sum+t.length,0)
    const commit=(states:State[])=>{
      let state:State|undefined=states.reduce<State|undefined>((best,s)=>!best||s.score<best.score?s:best,undefined)
      const addPieces=(pieces:Piece[])=>{for(const piece of pieces){const id=roads[piece.road].segment.id;coverage[id]=mergeIntervals([...(coverage[id]||[]),piece.range])}}
      const remember=(s:State)=>{if(s.previous&&s.route){anchors.set(s.index,s.candidate);anchors.set(s.previous.index,s.previous.candidate);linked.add(s.index)}}
      let pending:Piece[]=[],pendingStates:State[]=[]
      const flush=()=>{
        const unique=new Map<number,Interval[]>()
        for(const piece of pending)unique.set(piece.road,mergeIntervals([...(unique.get(piece.road)||[]),piece.range]))
        const meters=[...unique].reduce((sum,[id,ranges])=>sum+ranges.reduce((n,[a,b])=>n+b-a,0)*roads[id].length,0)
        if(meters>=MIN_FOLLOW-1e-6){addPieces(pending);pendingStates.forEach(remember)}
        pending=[];pendingStates=[]
      }
      while(state){
        if(state.route?.wide){pending.push(...state.route.pieces);pendingStates.push(state)}
        else {flush();addPieces(state.route?.pieces||[]);remember(state)}
        state=state.previous
      }
      flush()
    }
    // Preserve discontinuities even when callers bypass the file parser.
    const continuous:TrackPoint[][]=[]
    for(const track of tracks){let part:TrackPoint[]=[];for(const p of track){const prev=part.at(-1),seconds=prev?.time&&p.time?(Date.parse(p.time)-Date.parse(prev.time))/1000:0;if(prev&&(dist(xy(prev.coordinates),xy(p.coordinates))>200||seconds>120||seconds<0)){if(part.length>1)continuous.push(part);part=[]}part.push(p)}if(part.length>1)continuous.push(part)}
    for(const track of continuous){
      anchors=new Map();linked=new Set()
      const obs=observations(track);let states:State[]=[],wideMode=false
      for(let i=0;i<obs.length;i++){
        const cs=candidates(obs[i],obs[Math.max(0,i-1)],obs[Math.min(obs.length-1,i+1)])
        // Keep the original <=15 m chains independent from the fallback. This
        // preserves existing automatic coverage and cannot steer it onto a new road.
        const isWide=cs.some(c=>c.distance>TOL)
        if(isWide!==wideMode){commit(states);states=[];wideMode=isWide}
        let next:State[]=[]
        for(const c of cs){
          let best:State|undefined
          for(const prev of states){
            const path=route(prev.candidate,c,obs[i-1],obs[i]);if(!path)continue
            const score=prev.score+c.distance+4*c.heading+0.8*Math.abs(path.length-dist(obs[i-1],obs[i]))
            if(!best||score<best.score)best={index:i,candidate:c,score,previous:prev,route:path}
          }
          if(best)next.push(best)
        }
        if(!next.length){commit(states);next=cs.map(candidate=>({index:i,candidate,score:candidate.distance+4*candidate.heading}))}
        states=next
        if(i%100===0)onProgress?.(Math.round(100*(done+(obs.length?i/obs.length:0)*track.length)/Math.max(1,total)))
      }
      commit(states)
      const ordered=[...anchors].sort((a,b)=>a[0]-b[0])
      for(let k=1;k<ordered.length;k++){
        const [before,a]=ordered[k-1],[after,b]=ordered[k]
        // Require a recognised approach and departure in this same trace, not
        // merely two isolated snaps. Never connect across track/time gaps.
        if(linked.has(after)||!linked.has(before)||!linked.has(after+1)||!anchors.has(after+1)||after-before>10)continue
        for(const piece of bridgeGap(roads,adj,a,b,obs.slice(before,after+1))){const id=roads[piece.road].segment.id;coverage[id]=mergeIntervals([...(coverage[id]||[]),piece.range])}
      }
      done+=track.length
    }
    for(const id of Object.keys(coverage))if(!coverage[id].length)delete coverage[id]
    onProgress?.(100)
    return {segmentIds:Object.keys(coverage).sort(),coverage}
  }
}
export function matchSegments(segments:Segment[],tracks:TrackPoint[][],onProgress?:(done:number)=>void):MatchResult{return createNetworkMatcher(segments)(tracks,onProgress)}
