import type { IgnoredReview } from '../review/diagnostics'
import type { Activity, Network, TrackPoint, MatchResult, Correction } from '../types'
import { db, recalculateActivities, type LyonDatabase } from './database'
import { fraction } from '../stats/progress'
import { contentHash } from '../gpx/parse'
import { MATCHING_PARAMETERS, MATCHING_VERSION, MAX_BACKUP_BYTES, MAX_BACKUP_POINTS, MAX_GPX_POINTS } from '../utils/config'
import { lineLength, tracksLength, validCoordinate } from '../utils/geometry'
export interface Backup { format: 'lyon-100-backup'; schemaVersion: 2; networkVersion: string; sourceHash: string; matchingVersion: string; parameters: typeof MATCHING_PARAMETERS; exportedAt: string; activities: Activity[]; corrections: Correction[]; reviewIgnored?: IgnoredReview[] }
const invalid = () => new Error('Cette sauvegarde est invalide ou incompatible avec cette version de Lyon 100. Aucune donnée n’a été remplacée.')
export async function exportBackup(network: Network, database = db): Promise<string> {
  return database.transaction('r',database.activities,database.corrections,database.settings,async()=>{
  const backup: Backup = { format: 'lyon-100-backup', schemaVersion: 2, networkVersion: network.version, sourceHash: network.sourceHash, matchingVersion: MATCHING_VERSION, parameters: MATCHING_PARAMETERS, exportedAt: new Date().toISOString(), activities: await database.activities.toArray(), corrections: await database.corrections.toArray(), reviewIgnored: ((await database.settings.get('reviewIgnored'))?.value as IgnoredReview[]|undefined)||[] }
  return JSON.stringify(backup)
  })
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function date(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)) }
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
export async function validateBackup(text: string, network: Network, match: (tracks: TrackPoint[][]) => Promise<MatchResult>): Promise<{ activities: Activity[]; corrections: Correction[]; reviewIgnored?: IgnoredReview[] }> {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('Cette sauvegarde dépasse la limite de 100 Mo.')
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw invalid() }
  if (!record(payload) || payload.format !== 'lyon-100-backup' || ![1,2].includes(payload.schemaVersion as number) || !date(payload.exportedAt) || !Array.isArray(payload.activities)) throw invalid()
  const legacyV1=payload.schemaVersion===1 && payload.matchingVersion==='1.0.0'
  const previousNetwork=payload.schemaVersion===2 && payload.networkVersion==='lyon-v2-4615266167e59389' && payload.matchingVersion==='2.0.0' && payload.sourceHash===network.sourceHash
  const previousMatching=payload.schemaVersion===2 && payload.networkVersion===network.version && payload.sourceHash===network.sourceHash && ['2.0.0','2.1.0'].includes(payload.matchingVersion as string)
  const legacy=legacyV1 || (previousNetwork && payload.networkVersion!==network.version) || previousMatching
  if(!legacy && (payload.schemaVersion!==2 || payload.networkVersion!==network.version || payload.sourceHash!==network.sourceHash || payload.matchingVersion!==MATCHING_VERSION))throw invalid()
  const corrections:Correction[]=[]
  if(!legacyV1){
    if(!Array.isArray(payload.corrections))throw invalid()
    const seen=new Set<string>(),eligible=new Set(network.segments.map(s=>s.id))
    for(const c of payload.corrections){
      if(!record(c)||typeof c.segmentId!=='string'||!eligible.has(c.segmentId)||seen.has(c.segmentId)||!['include','remove','exclude'].includes(c.action as string)||!date(c.updatedAt)||c.networkVersion!==payload.networkVersion)throw invalid()
      seen.add(c.segmentId);corrections.push({...c,networkVersion:network.version} as unknown as Correction)
    }
  }
  const ids = new Set<string>(), rawHashes = new Set<string>(), contentHashes = new Set<string>()
  const eligible = new Set([...network.segments,...(network.connectors||[])].map(s => s.id))
  let count = 0
  const result: Activity[] = []
  for (const input of payload.activities) {
    if (!record(input) || typeof input.id !== 'string' || !input.id || ids.has(input.id) || typeof input.name !== 'string' || input.name.length > 200 || typeof input.fileName !== 'string' || !date(input.importedAt) || (input.date !== null && !date(input.date)) || !hash(input.rawHash) || !hash(input.contentHash) || input.networkVersion !== payload.networkVersion || input.matchingVersion !== payload.matchingVersion || !Number.isInteger(input.gaps) || (input.gaps as number) < 0 || !Array.isArray(input.tracks) || !input.tracks.length || !Array.isArray(input.segmentIds) || input.segmentIds.some(id => typeof id !== 'string' || (!legacy && !eligible.has(id))) || new Set(input.segmentIds).size !== input.segmentIds.length || typeof input.distanceMeters !== 'number' || !Number.isFinite(input.distanceMeters) || input.distanceMeters < 0 || typeof input.newMeters !== 'number' || !Number.isFinite(input.newMeters) || input.newMeters < 0 || !Number.isInteger(input.newSegments) || (input.newSegments as number) < 0) throw invalid()
    let activityPoints = 0
    const tracks: TrackPoint[][] = []
    for (const line of input.tracks) {
      if (!Array.isArray(line) || line.length < 2) throw invalid()
      const output: TrackPoint[] = []
      for (const p of line) {
        if (!record(p) || !validCoordinate(p.coordinates) || (p.time !== null && !date(p.time))) throw invalid()
        const previous = output.at(-1)
        if (previous) {
          const d = lineLength([previous.coordinates, p.coordinates])
          const t = previous.time && p.time ? (Date.parse(p.time) - Date.parse(previous.time)) / 1000 : 0
          if (d <= 0 || d > 200 || t > 120) throw invalid()
        }
        output.push({ coordinates: p.coordinates, time: p.time })
        if (++activityPoints > MAX_GPX_POINTS || ++count > MAX_BACKUP_POINTS) throw invalid()
      }
      tracks.push(output)
    }
    const actualHash = await contentHash({ tracks })
    if (actualHash !== input.contentHash || rawHashes.has(input.rawHash as string) || contentHashes.has(actualHash)) throw invalid()
    const actualDistance = tracksLength(tracks)
    if (Math.abs(actualDistance - input.distanceMeters) > 0.01) throw invalid()
    const computed = await match(tracks)
    if(!legacy){
      // Different JavaScript engines may differ in the final floating-point bits.
      // 1e-9 of a <=10 m unit is <=0.00000001 m; not a GPS tolerance.
      const saved = input.coverage, calculated = computed.coverage ?? {}
      if (!record(saved) || JSON.stringify([...computed.segmentIds].sort()) !== JSON.stringify([...input.segmentIds].sort()) || JSON.stringify(Object.keys(saved).sort()) !== JSON.stringify(Object.keys(calculated).sort())) throw invalid()
      for (const [id, ranges] of Object.entries(calculated)) {
        const stored = saved[id]
        if (!Array.isArray(stored) || stored.length !== ranges.length) throw invalid()
        for (let i = 0; i < ranges.length; i++) {
          const pair = stored[i]
          if (!Array.isArray(pair) || pair.length !== 2 || pair.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) || pair[0] > pair[1] || Math.abs(pair[0] - ranges[i][0]) > 1e-9 || Math.abs(pair[1] - ranges[i][1]) > 1e-9) throw invalid()
        }
      }
    }
    if(!legacy){const meters=network.segments.reduce((sum,s)=>sum+s.lengthMeters*fraction(computed.coverage?.[s.id]),0);if(input.newMeters>meters+.01||(input.newSegments as number)>computed.segmentIds.length)throw invalid()}
    const a: Activity = { id: input.id, name: input.name, fileName: input.fileName, importedAt: input.importedAt, date: input.date, gaps: input.gaps as number, rawHash: input.rawHash as string, contentHash: actualHash, networkVersion: network.version, matchingVersion: MATCHING_VERSION, tracks, distanceMeters: actualDistance, ...computed, newMeters: input.newMeters, newSegments: input.newSegments as number }
    ids.add(a.id); rawHashes.add(a.rawHash); contentHashes.add(a.contentHash); result.push(a)
  }
  const reviewIgnored:IgnoredReview[]=[]
  if(payload.reviewIgnored!==undefined){
    if(!Array.isArray(payload.reviewIgnored)||payload.reviewIgnored.length>100_000)throw invalid()
    const seen=new Set<string>()
    for(const item of payload.reviewIgnored){
      if(!record(item)||typeof item.activityId!=='string'||!ids.has(item.activityId)||typeof item.segmentId!=='string'||!eligible.has(item.segmentId)||typeof item.version!=='string'||!/^\d{1,4}$/.test(item.version))throw invalid()
      const key=JSON.stringify([item.activityId,item.segmentId,item.version]);if(seen.has(key))throw invalid();seen.add(key)
      reviewIgnored.push({activityId:item.activityId,segmentId:item.segmentId,version:item.version})
    }
  }
  return {activities: legacy?await recalculateActivities(result,network,async tracks => {const found=result.find(a=>a.tracks===tracks)!;return {segmentIds:found.segmentIds,coverage:found.coverage}}):result,corrections,reviewIgnored}
}
export async function restoreBackup(input: {activities:Activity[];corrections:Correction[];reviewIgnored?:IgnoredReview[]} | Activity[], network: Network, database: LyonDatabase = db) {
  const {activities,corrections,reviewIgnored=[]}=Array.isArray(input)?{activities:input,corrections:[]}:input
  await database.transaction('rw', database.activities, database.settings, database.corrections, async () => {
    await database.settings.put({key:'reviewIgnored',value:reviewIgnored})
    await database.activities.clear()
    await database.activities.bulkAdd(activities)
    await database.corrections.clear()
    await database.corrections.bulkAdd(corrections)
    await database.settings.put({ key: 'networkVersion', value: network.version })
    await database.settings.put({ key: 'matching', value: { version: MATCHING_VERSION, ...MATCHING_PARAMETERS } })
  })
}
