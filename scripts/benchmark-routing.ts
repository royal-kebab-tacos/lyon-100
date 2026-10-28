import {readFileSync} from 'node:fs'
import {createRoutingSearch} from '../src/routing/search'
import {lineLength} from '../src/utils/geometry'
import type {RoutingGraph} from '../src/routing/types'
const graph:RoutingGraph=JSON.parse(readFileSync('.osm-cache/routing-prototype.json','utf8'))
const started=performance.now(),search=createRoutingSearch(graph),indexMs=performance.now()-started
const nearest=(lon:number,lat:number)=>Object.keys(graph.nodes).reduce((a,b)=>lineLength([[lon,lat],graph.nodes[a]])<lineLength([[lon,lat],graph.nodes[b]])?a:b)
// Public landmark coordinates only. Nearest-node choice is diagnostic, not a
// claimed accessible link from the landmark to the network.
const start=nearest(4.8357,45.754),targets=[[4.832,45.7485],[4.8345,45.764],[4.85,45.76]]
const results=targets.map(([lon,lat])=>{const target=nearest(lon,lat),t=performance.now(),result=search.probe(start,target,{maxMeters:6000,maxVisited:20000,maxMilliseconds:1000});return {target,elapsedMs:Math.round(performance.now()-t),status:result.status,visited:result.visited,...(result.status==='found'?{meters:Math.round(result.meters),edges:result.steps.length}:{})}})
console.log(JSON.stringify({purpose:'topology-only; not pedestrian navigation validation',indexMs:Math.round(indexMs),missing:graph.audit.missing,results},null,2))
