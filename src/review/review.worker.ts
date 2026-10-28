import { diagnose } from './diagnostics'
import type { Segment, TrackPoint } from '../types'
self.onmessage=(e:MessageEvent<{segments:Segment[];tracks:TrackPoint[][]}>)=>{
  try{self.postMessage({result:diagnose(e.data.segments,e.data.tracks,n=>self.postMessage({progress:n}))})}
  catch{self.postMessage({error:true})}
}
