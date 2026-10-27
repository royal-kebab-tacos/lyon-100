import type { MatchResult, Network, TrackPoint } from '../types'
export function createMatcher(network: Network) {
  const worker = new Worker(new URL('./matching.worker.ts', import.meta.url), { type: 'module' })
  worker.postMessage({ type: 'init', network })
  return {
    match(tracks: TrackPoint[][], onProgress: (done: number) => void): Promise<MatchResult> {
      return new Promise((resolve, reject) => {
        worker.onmessage = e => {
          if (e.data.type === 'progress') onProgress(e.data.done)
          else if (e.data.type === 'result') resolve(e.data.result)
          else reject(new Error('L’analyse de la trace a échoué. Réessayez avec ce fichier.'))
        }
        worker.onerror = () => reject(new Error('L’analyse a été interrompue. Aucune sortie partielle n’a été enregistrée.'))
        worker.postMessage({ type: 'match', tracks })
      })
    },
    close() { worker.terminate() },
  }
}
