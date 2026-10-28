import { buildHistory, type HistoryActivity, type HistorySegment } from './history'
self.onmessage = (event: MessageEvent<{segments: HistorySegment[]; activities: HistoryActivity[]; excluded: string[]}>) => {
  try { self.postMessage({result:buildHistory(event.data.segments,event.data.activities,event.data.excluded)}) }
  catch { self.postMessage({error:true}) }
}
