import {readFileSync,writeFileSync} from 'node:fs'
import {sampleEdge,elevationKey} from '../src/routing/relief'
import type {RoutingGraph} from '../src/routing/types'
const manifest=JSON.parse(readFileSync('src/routing/dataset-manifest.json','utf8'))
const {graph}:{graph:RoutingGraph}=JSON.parse(Buffer.concat(manifest.parts.map((p:{path:string})=>readFileSync('public/'+p.path))).toString())
const points=new Set<string>()
for(const edge of graph.edges)if(edge.bridge==='no'&&edge.tunnel==='no')for(const p of sampleEdge(edge))points.add(elevationKey(p.coordinates))
writeFileSync('.osm-cache/elevation-points.json',JSON.stringify({sourceHash:graph.sourceHash,points:[...points].sort()}))
console.log(points.size+' public OSM sample locations')
