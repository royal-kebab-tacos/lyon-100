import type { Coordinate, Coverage, Segment } from '../types'
import { mergeIntervals } from '../stats/progress'
import { createViewportIndex } from './viewport'

/** Local metric projection for proximity only. Scored lengths remain geodesic.
 * Clip every polyline edge to the circle, then subtract covered fractions.
 * A partially covered unit must not count its covered end as nearby potential. */
export function createNearbySearch(segments: Segment[]) {
  const index = createViewportIndex(segments)
  return (center: Coordinate, radius: number, coverage: Coverage, excluded: Set<string>, district = 0) => {
    const sy = 111195.08, sx = sy * Math.cos(center[1] * Math.PI / 180)
    const rows = new Map<string, { name: string; meters: number; distance: number; segment: Segment }>()
    let meters = 0, unnamedMeters = 0
    if (!Number.isFinite(radius) || radius <= 0 || radius > 3000) return { meters, unnamedMeters, rows: [], streetCount: 0 }
    for (const s of index.query({ west: center[0]-radius/sx, east: center[0]+radius/sx, south: center[1]-radius/sy, north: center[1]+radius/sy })) {
      if (s.connector || excluded.has(s.id) || (district && s.district !== district)) continue
      const points = s.coordinates.map(p => [(p[0]-center[0])*sx, (p[1]-center[1])*sy])
      const lengths = points.slice(1).map((p,i) => Math.hypot(p[0]-points[i][0], p[1]-points[i][1]))
      const total = lengths.reduce((a,b)=>a+b,0)
      if (!total) continue
      const covered = mergeIntervals(coverage[s.id] || [])
      let offset = 0, remaining = 0, nearest = Infinity
      for (let i=0;i<lengths.length;i++) {
        const length = lengths[i], [x,y] = points[i], dx = points[i+1][0]-x, dy = points[i+1][1]-y
        if (!length) continue
        const dot = x*dx+y*dy, disc = dot*dot-length*length*(x*x+y*y-radius*radius)
        if (disc > 0) {
          const lo = Math.max(0,(-dot-Math.sqrt(disc))/(length*length)), hi = Math.min(1,(-dot+Math.sqrt(disc))/(length*length))
          if (hi > lo) {
            let cursor = (offset+lo*length)/total
            const end = (offset+hi*length)/total
            const add = (a:number,b:number) => {
              if (b-a <= 1e-8) return
              remaining += (b-a)*s.lengthMeters
              const t = Math.max((a*total-offset)/length,Math.min((b*total-offset)/length,-dot/(length*length)))
              nearest = Math.min(nearest,Math.hypot(x+t*dx,y+t*dy))
            }
            for (const [a,b] of covered) { if (a>end) break; add(cursor,Math.min(a,end)); cursor=Math.max(cursor,b); if(cursor>=end) break }
            add(cursor,end)
          }
        }
        offset += length
      }
      if (remaining <= 1e-6) continue
      meters += remaining
      const name = s.name.normalize('NFC').trim()
      if (!name) { unnamedMeters += remaining; continue }
      const row = rows.get(name) || { name, meters:0, distance:Infinity, segment:s }
      row.meters += remaining
      if (nearest < row.distance) { row.distance=nearest; row.segment=s }
      rows.set(name,row)
    }
    return { meters, unnamedMeters, streetCount:rows.size, rows:[...rows.values()].sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name,'fr')) }
  }
}
