import {readFileSync,writeFileSync} from 'node:fs'
import {linkRoutingScore,createRouteRewards} from '../src/routing/rewards'
import {proposeLoops} from '../src/routing/loops'
import {progress} from '../src/stats/progress'
import {lineLength} from '../src/utils/geometry'
import type {RoutingGraph} from '../src/routing/types'
import type {Activity,Correction,Network} from '../src/types'
const graph:RoutingGraph=JSON.parse(readFileSync('.osm-cache/routing-prototype.json','utf8')),network:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8'))
const backup: {activities:Activity[];corrections:Correction[]}|null=process.argv[2]?JSON.parse(readFileSync(process.argv[2],'utf8')):null
const stats=progress(network,backup?.activities||[],backup?.corrections||[])
let started=performance.now();const links=linkRoutingScore(graph,network.segments),linkMs=Math.round(performance.now()-started)
writeFileSync('.osm-cache/routing-score-links.json',JSON.stringify(links))
started=performance.now();const rewards=createRouteRewards(graph,links,network.segments,stats.coverage,stats.excluded),rewardMs=Math.round(performance.now()-started)
const origin:[number,number]=[4.8357,45.754]
const start=Object.keys(graph.nodes).reduce((a,b)=>lineLength([origin,graph.nodes[a]])<lineLength([origin,graph.nodes[b]])?a:b)
const results=([5000,8000,10000,15000] as const).map(targetMeters=>{
 const before=performance.now(),result=proposeLoops(graph,rewards,{start,targetMeters,maxMilliseconds:2000,maxVisited:800000})
 // Private diagnostic outputs remain ignored; no activity names or GPS are printed.
 writeFileSync(`.osm-cache/loops-${targetMeters}.json`,JSON.stringify({start,result}))
 return {targetMeters,elapsedMs:Math.round(performance.now()-before),status:result.status,visited:result.visited,attempts:result.attempts,proposals:result.proposals.map(p=>({meters:Math.round(p.meters),newMeters:Math.round(p.newMeters),repeatedMeters:Math.round(p.repeatedMeters)}))}
})
console.log(JSON.stringify({realBackup:Boolean(backup),sourceHash:graph.sourceHash,networkVersion:network.version,linkMs,rewardMs,linkedSegments:links.linkedSegments,totalSegments:network.segments.length,linkedMeters:Math.round(links.linkedMeters),totalMeters:Math.round(network.totalMeters),results},null,2))
