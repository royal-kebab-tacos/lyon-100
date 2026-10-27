/** Read-only local verification. Personal backups must not be committed or bundled. */
import {readFileSync} from 'node:fs'
import {createNetworkMatcher} from '../src/gpx/matching.ts'
import {validateBackup} from '../src/db/backup.ts'
import {progress} from '../src/stats/progress.ts'
import type {Network} from '../src/types/index.ts'
const path=process.argv[2]
if(!path)throw new Error('Indiquez le chemin du JSON à vérifier. Le fichier ne sera pas modifié.')
const network:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8')),text=readFileSync(path,'utf8'),input=JSON.parse(text),match=createNetworkMatcher(network.segments)
const start=performance.now(),result=await validateBackup(text,network,async tracks=>match(tracks))
if(result.activities.length!==input.activities.length||result.activities.some(a=>JSON.stringify(a.tracks)!==JSON.stringify(input.activities.find((b:{id:string})=>b.id===a.id)?.tracks)))throw new Error('Les traces ne sont pas identiques.')
const stats=progress(network,result.activities,result.corrections)
console.log(JSON.stringify({activities:result.activities.length,tracesUnchanged:true,network:network.version,coveredKm:stats.meters/1000,percent:stats.percent,durationMs:Math.round(performance.now()-start)},null,2))
