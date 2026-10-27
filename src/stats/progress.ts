import type { Activity, Network, Segment, Coverage, Interval, Correction } from '../types'
import { STREET_COMPLETION_THRESHOLD } from '../utils/config'
export function mergeIntervals(values: Interval[]): Interval[] {
  const result: Interval[] = []
  for (const [a,b] of values.map(([a,b]): Interval => [Math.max(0,Math.min(a,b)),Math.min(1,Math.max(a,b))]).filter(([a,b])=>b-a>1e-8).sort((a,b)=>a[0]-b[0])) {
    const previous=result.at(-1)
    if(previous && a<=previous[1]+1e-8) previous[1]=Math.max(previous[1],b)
    else result.push([a,b])
  }
  return result
}
export function activityCoverage(a: Pick<Activity,'segmentIds'|'coverage'>): Coverage { return a.coverage ?? Object.fromEntries(a.segmentIds.map(id=>[id,[[0,1]]])) }
export function unionCoverage(activities: Pick<Activity,'segmentIds'|'coverage'>[]): Coverage {
  const result: Coverage={}
  for(const a of activities) for(const [id,ranges] of Object.entries(activityCoverage(a))) result[id]=mergeIntervals([...(result[id]||[]),...ranges])
  return result
}
export const fraction = (ranges: Interval[] = []) => mergeIntervals(ranges).reduce((sum,[a,b])=>sum+b-a,0)
export function coveredIds(activities: Pick<Activity,'segmentIds'|'coverage'>[]): Set<string> { return new Set(Object.keys(unionCoverage(activities))) }
export function progress(network: Pick<Network,'segments'|'totalMeters'>, activities: Pick<Activity,'segmentIds'|'coverage'>[], corrections: Correction[] = [], district=0) {
  const coverage=unionCoverage(activities), excluded=new Set<string>()
  for(const c of corrections) {
    if(c.action==='include')coverage[c.segmentId]=[[0,1]]
    else delete coverage[c.segmentId]
    if(c.action==='exclude')excluded.add(c.segmentId)
  }
  const segments=network.segments.filter(s=>!excluded.has(s.id)&&(!district||s.district===district))
  const totalMeters=segments.reduce((sum,s)=>sum+s.lengthMeters,0)
  const meters=segments.reduce((sum,s)=>sum+s.lengthMeters*fraction(coverage[s.id]),0)
  return { coverage, excluded, covered:new Set(Object.keys(coverage)), meters,totalMeters,remainingMeters:Math.max(0,totalMeters-meters),percent:totalMeters?Math.min(100,100*meters/totalMeters):0,activities:activities.length }
}
export function contribution(segments: Segment[], ids: string[], previous: Set<string> | Coverage, coverage?: Coverage) {
  const before: Coverage=previous instanceof Set?Object.fromEntries([...previous].map(id=>[id,[[0,1]]])):previous
  const incoming=coverage??Object.fromEntries(ids.map(id=>[id,[[0,1]] as Interval[]]))
  let newMeters=0,newSegments=0
  for(const s of segments) {
    const added=fraction([...(before[s.id]||[]),...(incoming[s.id]||[])])-fraction(before[s.id])
    if(added>1e-8){newMeters+=added*s.lengthMeters;newSegments++}
  }
  return {newMeters,newSegments}
}
export function streetProgress(network: Network, coverage: Coverage | Set<string>, excluded=new Set<string>(), district=0) {
  const streets=new Map<string,{name:string;total:number;done:number;count:number;doneCount:number;status:string}>()
  for(const s of network.segments) {
    if(!s.name.trim()||excluded.has(s.id)||(district&&s.district!==district))continue
    const name=s.name.normalize('NFC').trim(),row=streets.get(name)||{name,total:0,done:0,count:0,doneCount:0,status:'Non commencée'}
    const f=coverage instanceof Set?Number(coverage.has(s.id)):fraction(coverage[s.id])
    row.total+=s.lengthMeters;row.count++;row.done+=f*s.lengthMeters;if(f>=1-1e-8)row.doneCount++
    row.status=row.done/row.total>=STREET_COMPLETION_THRESHOLD?'Terminée':row.done>0?'Partiellement parcourue':'Non commencée'
    streets.set(name,row)
  }
  return [...streets.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'))
}
export const km=(meters:number)=>(meters/1000).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})
export function percentText(percent:number,complete=false):string{return (complete?100:Math.min(99.9,percent)).toLocaleString('fr-FR',{maximumFractionDigits:1})}
