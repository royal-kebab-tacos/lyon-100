import { db, type LyonDatabase } from '../db/database'
import { DIAGNOSTIC_VERSION, type IgnoredReview } from './diagnostics'
export async function ignoreReview(activityId:string,segmentId:string,networkVersion:string,database:LyonDatabase=db){
  await database.transaction('rw',database.settings,database.activities,async()=>{
    if((await database.settings.get('networkVersion'))?.value!==networkVersion||!await database.activities.get(activityId))throw new Error('Vos données ont changé. Rechargez avant de continuer.')
    const previous=(await database.settings.get('reviewIgnored'))?.value as IgnoredReview[]|undefined
    const entries=(previous||[]).filter(r=>r.activityId!==activityId||r.segmentId!==segmentId||r.version!==DIAGNOSTIC_VERSION)
    entries.push({activityId,segmentId,version:DIAGNOSTIC_VERSION})
    await database.settings.put({key:'reviewIgnored',value:entries})
  })
}
export async function clearIgnoredReviews(activityId:string,database:LyonDatabase=db){
  await database.transaction('rw',database.settings,async()=>{
    const previous=(await database.settings.get('reviewIgnored'))?.value as IgnoredReview[]|undefined
    await database.settings.put({key:'reviewIgnored',value:(previous||[]).filter(r=>r.activityId!==activityId)})
  })
}
