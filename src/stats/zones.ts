import type { Activity, Correction, Network } from '../types'
import { fraction, progress } from './progress'
import { STREET_COMPLETION_THRESHOLD } from '../utils/config'

export const MILESTONES = [25, 50, 75, 100] as const
export interface ZoneSummary {
  id: number; totalMeters: number; meters: number; remainingMeters: number
  percent: number; streets: number; completedStreets: number
}
/** Merge activities once, then assign every eligible unit to Lyon and its district. */
export function zoneSummaries(network: Network, activities: Activity[], corrections: Correction[]): ZoneSummary[] {
  const { coverage, excluded } = progress(network, activities, corrections)
  const zones = Array.from({ length: 10 }, (_, id) => ({ id, totalMeters: 0, meters: 0, remainingMeters: 0, percent: 0, streets: 0, completedStreets: 0 }))
  const streets = zones.map(() => new Map<string, { total: number; done: number }>())
  for (const s of network.segments) {
    if (excluded.has(s.id)) continue
    const done = s.lengthMeters * fraction(coverage[s.id])
    const ids = s.district && s.district >= 1 && s.district <= 9 ? [0, s.district] : [0]
    for (const id of ids) {
      zones[id].totalMeters += s.lengthMeters; zones[id].meters += done
      const name = s.name.normalize('NFC').trim()
      if (name) {
        const row = streets[id].get(name) || { total: 0, done: 0 }
        row.total += s.lengthMeters; row.done += done; streets[id].set(name, row)
      }
    }
  }
  return zones.map((z, id) => ({ ...z,
    remainingMeters: Math.max(0, z.totalMeters - z.meters),
    percent: z.totalMeters ? Math.min(100, 100 * z.meters / z.totalMeters) : 0,
    streets: streets[id].size,
    completedStreets: [...streets[id].values()].filter(s => s.total > 0 && s.done / s.total >= STREET_COMPLETION_THRESHOLD).length,
  }))
}
export function zoneHighlights(zones: ZoneSummary[]) {
  const eligible = zones.filter(z => z.id > 0 && z.totalMeters > 0)
  return {
    leading: eligible.filter(z => z.meters > 0).sort((a,b) => b.percent-a.percent || a.id-b.id)[0],
    closest: eligible.filter(z => z.remainingMeters > 1e-8).sort((a,b) => a.remainingMeters-b.remainingMeters || a.id-b.id)[0],
  }
}
export function reachedMilestone(zone: ZoneSummary, milestone: number) {
  return zone.totalMeters > 0 && (milestone === 100 ? zone.remainingMeters <= 1e-8 : zone.percent >= milestone)
}
