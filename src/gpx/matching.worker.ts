import { createNetworkMatcher } from './matching'
import type { Network, TrackPoint } from '../types'
let match: ReturnType<typeof createNetworkMatcher>
self.onmessage = (event: MessageEvent<{ type: 'init'; network: Network } | { type: 'match'; tracks: TrackPoint[][] }>) => {
  if (event.data.type === 'init') { match = createNetworkMatcher(event.data.network.segments); return }
  try {
    const result = match(event.data.tracks, done => self.postMessage({ type: 'progress', done }))
    self.postMessage({ type: 'result', result })
  } catch { self.postMessage({ type: 'error' }) }
}
