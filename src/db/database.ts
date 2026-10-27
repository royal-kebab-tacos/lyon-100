import Dexie, { type Table } from 'dexie'
import type { Activity, Network, ParsedActivity, MatchResult, TrackPoint, Correction } from '../types'
import { MATCHING_PARAMETERS, MATCHING_VERSION } from '../utils/config'
import { contribution, unionCoverage } from '../stats/progress'
import { matchSegments } from '../gpx/matching'
export class LyonDatabase extends Dexie {
  activities!: Table<Activity,string>
  settings!: Table<{key:string;value:unknown},string>
  corrections!: Table<Correction,string>
  recovery!: Table<{key:string;value:unknown},string>
  constructor(name='lyon-100') {
    super(name)
    this.version(1).stores({activities:'id,&rawHash,&contentHash,importedAt,date',settings:'key'})
    this.version(2).stores({activities:'id,&rawHash,&contentHash,importedAt,date',settings:'key',corrections:'segmentId',recovery:'key'})
  }
}
export const db=new LyonDatabase()
export async function recalculateActivities(activities:Activity[],network:Network,match:(tracks:TrackPoint[][])=>Promise<MatchResult>) {
  const output:Activity[]=[]
  for(const a of [...activities].sort((a,b)=>a.importedAt.localeCompare(b.importedAt)||a.id.localeCompare(b.id))) {
    const result=await match(a.tracks)
    output.push({...a,...result,networkVersion:network.version,matchingVersion:MATCHING_VERSION,...contribution(network.segments,result.segmentIds,unionCoverage(output),result.coverage)})
  }
  return output
}
export async function ensureNetwork(network:Network,database=db,match=(tracks:TrackPoint[][])=>Promise.resolve(matchSegments(network.segments,tracks))) {
  const original=await database.activities.toArray(),corrections=await database.corrections.toArray()
  const migrate=original.some(a=>a.networkVersion!==network.version||a.matchingVersion!==MATCHING_VERSION||!a.coverage)
  const eligible=new Set(network.segments.map(s=>s.id))
  if(corrections.some(c=>!eligible.has(c.segmentId)))throw new Error('Le réseau a changé et contient des corrections manuelles incompatibles. Vos données sont conservées. Revenez à la version précédente pour les exporter.')
  const updated=migrate?await recalculateActivities(original,network,match):original
  await database.transaction('rw',database.activities,database.settings,database.corrections,database.recovery,async()=>{
    if(JSON.stringify(await database.activities.toArray())!==JSON.stringify(original)||JSON.stringify(await database.corrections.toArray())!==JSON.stringify(corrections))throw new Error('Vos données ont changé dans un autre onglet. Rechargez pour reprendre le calcul sans perte.')
    if(migrate){
      await database.recovery.put({key:'before-migration',value:{activities:original,corrections,settings:await database.settings.toArray(),savedAt:new Date().toISOString()}})
      await database.activities.bulkPut(updated)
    }
    await database.settings.put({key:'networkVersion',value:network.version})
    await database.settings.put({key:'matching',value:{version:MATCHING_VERSION,...MATCHING_PARAMETERS}})
  })
  return migrate?updated.length:0
}
export async function isDuplicate(rawHash:string,contentHash:string,database=db) {return !!(await database.activities.where('rawHash').equals(rawHash).first()||await database.activities.where('contentHash').equals(contentHash).first())}
async function assertVersion(network:Network,database:LyonDatabase){
  const n=await database.settings.get('networkVersion'),m=await database.settings.get('matching')
  if(n?.value!==network.version||(m?.value as {version?:string})?.version!==MATCHING_VERSION)throw new Error('Le réseau a changé. Rechargez Lyon 100 avant de continuer.')
}
export async function saveActivity(parsed:ParsedActivity,fileName:string,rawHash:string,contentHash:string,result:MatchResult|string[],network:Network,database=db):Promise<Activity|null>{
  return database.transaction('rw',database.activities,database.settings,async()=>{
    await assertVersion(network,database)
    if(await isDuplicate(rawHash,contentHash,database))return null
    const matched=Array.isArray(result)?{segmentIds:result}:result
    const segmentIds=[...new Set(matched.segmentIds)],previous=unionCoverage(await database.activities.toArray())
    const activity:Activity={...parsed,...matched,segmentIds,id:crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),fileName,rawHash,contentHash,importedAt:new Date().toISOString(),networkVersion:network.version,matchingVersion:MATCHING_VERSION,...contribution(network.segments,segmentIds,previous,matched.coverage)}
    await database.activities.add(activity);return activity
  })
}
export async function setCorrection(segmentId:string,action:Correction['action']|'auto',network:Network,database=db){
  if(!network.segments.some(s=>s.id===segmentId))throw new Error('Cette portion n’existe pas dans le réseau courant.')
  await database.transaction('rw',database.corrections,database.settings,async()=>{
    await assertVersion(network,database)
    if(action==='auto')await database.corrections.delete(segmentId)
    else await database.corrections.put({segmentId,action,networkVersion:network.version,updatedAt:new Date().toISOString()})
  })
}
export async function deleteActivity(id:string,database=db){await database.transaction('rw',database.activities,()=>database.activities.delete(id))}
export async function resetData(database=db){await database.transaction('rw',database.activities,database.corrections,database.recovery,async()=>{await database.activities.clear();await database.corrections.clear();await database.recovery.clear()})}
export function storageError():string{return 'Impossible d’enregistrer les données sur cet appareil. Vérifiez l’espace disponible et les autorisations du navigateur, puis réessayez. Vos sorties précédentes sont conservées.'}
