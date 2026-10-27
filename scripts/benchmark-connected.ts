import {readFileSync,writeFileSync} from 'node:fs'
import {createNetworkMatcher} from '../src/gpx/matching.ts'
import {progress,fraction} from '../src/stats/progress.ts'
import type {Network,TrackPoint} from '../src/types/index.ts'
const n:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8'))
const adj=new Map<string,{index:number;reverse:boolean}[]>()
for(let i=0;i<n.segments.length;i++){const s=n.segments[i];for(const [node,reverse] of [[s.startNode,false],[s.endNode,true]] as const)if(node)adj.set(node,[...(adj.get(node)||[]),{index:i,reverse}])}
const first=n.segments.find(s=>s.district===7&&s.name.includes('Guillotière')&&s.highway==='secondary'&&s.lengthMeters>8)!
let node=first.startNode!,distance=0
const used=new Map<number,number>(),tracks:TrackPoint[][]=[[]],expected=new Set<string>()
for(let step=0;step<5000&&distance<20000;step++){
 const edges=adj.get(node)||[];edges.sort((a,b)=>(used.get(a.index)||0)-(used.get(b.index)||0)||a.index-b.index)
 const choice=edges[0];if(!choice)break
 const s=n.segments[choice.index],coords=choice.reverse?[...s.coordinates].reverse():s.coordinates
 const track=tracks[0]
 for(let j=1;j<coords.length;j++){
   const a=coords[j-1],b=coords[j],count=Math.max(1,Math.ceil(s.lengthMeters/2))
   if(!track.length)track.push({coordinates:a,time:null})
   for(let k=1;k<=count;k++)track.push({coordinates:[a[0]+(b[0]-a[0])*k/count,a[1]+(b[1]-a[1])*k/count],time:null})
 }
 expected.add(s.id);used.set(choice.index,(used.get(choice.index)||0)+1);node=(choice.reverse?s.startNode:s.endNode)!;distance+=s.lengthMeters
}
const start=performance.now(),match=createNetworkMatcher(n.segments),indexed=performance.now(),result=match(tracks),end=performance.now(),meters=progress(n,[result]).meters,expectedMeters=n.segments.reduce((sum,s)=>sum+(expected.has(s.id)?s.lengthMeters:0),0)
const report={synthetic:true,description:'Parcours synthétique connecté sur le vrai réseau OSM, départ Lyon 7, sans GPS réel.',network:n.version,points:tracks[0].length,activityMeters:distance,expectedUniqueMeters:expectedMeters,matchedUniqueMeters:meters,missedUnits:[...expected].filter(id=>!result.segmentIds.includes(id)).length,extraUnits:result.segmentIds.filter(id=>!expected.has(id)).length,largestMisses:n.segments.filter(s=>expected.has(s.id)).map(s=>({id:s.id,name:s.name,miss:s.lengthMeters*(1-fraction(result.coverage?.[s.id]))})).filter(s=>s.miss>.05).sort((a,b)=>b.miss-a.miss).slice(0,10),indexMs:Math.round(indexed-start),matchingMs:Math.round(end-indexed)}
writeFileSync('tests/benchmark-connected.json',JSON.stringify(report,null,2)+'\n');console.log(report)
if(report.missedUnits||report.extraUnits||Math.abs(meters-expectedMeters)/expectedMeters>0.002)process.exitCode=1
