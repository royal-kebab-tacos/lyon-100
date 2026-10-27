import { lineString } from '@turf/helpers'
import length from '@turf/length'
import type { Coordinate, TrackPoint } from '../types'
export function lineLength(coordinates: Coordinate[]): number {
  return coordinates.length < 2 ? 0 : length(lineString(coordinates), { units: 'meters' })
}
export function tracksLength(tracks: TrackPoint[][]): number {
  return tracks.reduce((sum, track) => sum + lineLength(track.map(p => p.coordinates)), 0)
}
export function validCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length === 2 && value.every(v => typeof v === 'number' && Number.isFinite(v)) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90
}
