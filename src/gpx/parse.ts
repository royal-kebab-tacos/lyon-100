import { sha256 as digest } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { MAX_GPX_BYTES, MAX_GPX_POINTS } from '../utils/config'
import { lineLength, tracksLength, validCoordinate } from '../utils/geometry'
import type { ParsedActivity, TrackPoint } from '../types'
const invalid = () => new Error('Ce fichier ne semble pas être un GPX valide.')
function descendants(el: Document | Element, name: string): Element[] { return Array.from(el.getElementsByTagNameNS('*', name)) }
function child(el: Element, name: string): Element | undefined { return Array.from(el.children).find(c => c.localName === name) }
export function parseGpx(text: string, fileName = 'Sortie GPX'): ParsedActivity {
  if (new TextEncoder().encode(text).byteLength > MAX_GPX_BYTES) throw new Error('Ce GPX dépasse la limite de 20 Mo.')
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw invalid()
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (descendants(doc, 'parsererror').length || doc.documentElement.localName !== 'gpx') throw invalid()
  const trackElements = descendants(doc, 'trk')
  const groups = trackElements.length ? trackElements.flatMap(t => Array.from(t.children).filter(c => c.localName === 'trkseg')) : descendants(doc, 'rte')
  let pointCount = 0, gaps = 0
  const tracks: TrackPoint[][] = []
  for (const group of groups) {
    let line: TrackPoint[] = []
    const finish = () => { if (line.length >= 2) tracks.push(line); line = [] }
    for (const el of Array.from(group.children).filter(c => c.localName === (trackElements.length ? 'trkpt' : 'rtept'))) {
      if (++pointCount > MAX_GPX_POINTS) throw new Error('Ce GPX contient plus de 100 000 points.')
      const lat = el.getAttribute('lat'), lon = el.getAttribute('lon')
      const coordinates = [Number(lon), Number(lat)]
      if (lat === null || lon === null || !lat.trim() || !lon.trim() || !validCoordinate(coordinates)) { finish(); gaps++; continue }
      const timeText = child(el, 'time')?.textContent?.trim()
      const time = timeText && Number.isFinite(Date.parse(timeText)) ? new Date(timeText).toISOString() : null
      const previous = line.at(-1)
      if (previous) {
        const distance = lineLength([previous.coordinates, coordinates])
        const elapsed = time && previous.time ? (Date.parse(time) - Date.parse(previous.time)) / 1000 : 0
        if (distance > 200 || elapsed > 120) { finish(); gaps++ }
        else if (distance === 0) continue
      }
      line.push({ coordinates, time })
    }
    finish()
  }
  if (!tracks.length) throw invalid()
  const name = (trackElements.length ? child(trackElements[0], 'name') : descendants(doc, 'rte')[0] && child(descendants(doc, 'rte')[0], 'name'))?.textContent?.trim().slice(0, 200) || fileName.replace(/\.gpx$/i, '').slice(0, 200)
  return { name, date: tracks.flat().find(p => p.time)?.time ?? null, tracks, distanceMeters: tracksLength(tracks), gaps }
}
export async function sha256(text: string): Promise<string> {
  return bytesToHex(digest(new TextEncoder().encode(text)))
}
export async function contentHash(activity: Pick<ParsedActivity, 'tracks'>): Promise<string> {
  return sha256(JSON.stringify(activity.tracks.map(t => t.map(p => [Number(p.coordinates[0].toFixed(7)), Number(p.coordinates[1].toFixed(7)), p.time]))))
}
