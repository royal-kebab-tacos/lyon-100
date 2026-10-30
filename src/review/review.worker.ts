import { diagnose } from './diagnostics'
import type { Coverage, Segment, TrackPoint } from '../types'
self.onmessage=(e:MessageEvent<{segments:Segment[];tracks:TrackPoint[][];coverage?:Coverage}>)=>{
  try{self.postMessage({result:diagnose(e.data.segments,e.data.tracks,n=>self.postMessage({progress:n}),e.data.coverage)})}
  catch{self.postMessage({error:true})}
}

