import { readFileSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createNetworkMatcher } from '../src/gpx/matching.ts'
import { lineLength } from '../src/utils/geometry.ts'
import type { Coordinate, Network, TrackPoint } from '../src/types/index.ts'
const network:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8'))
const candidates=network.segments.filter(s=>s.name==='Rue de la République' && s.lengthMeters>8)
const fixture=candidates.slice(0,100)
const tracks:TrackPoint[][]=fixture.map(s=>s.coordinates.map(coordinates=>({coordinates,time:null})))
const expected=fixture.map(s=>s.id)
const buildStart=performance.now()
const matcher=createNetworkMatcher(network.segments)
const indexMs=performance.now()-buildStart
const start=performance.now()
const result=matcher(tracks)
const ms=performance.now()-start
const synthetic10000:TrackPoint[][]=[]
const base:Coordinate[]=[[4.835,45.755],[4.835,45.765]]
const line:TrackPoint[]=[]
for(let i=0;i<10_000;i++){const t=(i%1000)/999;line.push({coordinates:[base[0][0],base[0][1]+t*(base[1][1]-base[0][1])],time:null})}
// Each reversal is a new part, avoiding giant or artificial connecting edges.
for(let i=0;i<10;i++)synthetic10000.push(line.slice(i*1000,(i+1)*1000))
const start10=performance.now();const r10=matcher(synthetic10000);const ms10=performance.now()-start10
const report={indexMs:Math.round(indexMs),date:new Date().toISOString(),networkVersion:network.version,segments:network.segments.length,totalKm:network.totalMeters/1000,fixture:{segments:fixture.length,meters:fixture.reduce((s,a)=>s+a.lengthMeters,0),expectedAllDetected:expected.every(id=>result.segmentIds.includes(id)),matched:result.segmentIds.length,durationMs:Math.round(ms)},synthetic10000:{points:10000,matched:r10.segmentIds.length,durationMs:Math.round(ms10)},warning:'Mesures Node sur le serveur ; ne remplacent pas une recette iPhone ni des traces GPS réelles.'}
writeFileSync('tests/benchmark-results.json',JSON.stringify(report,null,2)+'\n')
const gpx=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Lyon 100 — exemple synthétique" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>EXEMPLE — Rue de la République (synthétique)</name>${fixture.map(s=>`<trkseg>${s.coordinates.map(p=>`<trkpt lon="${p[0]}" lat="${p[1]}"><time>2026-10-01T10:00:00Z</time></trkpt>`).join('')}</trkseg>`).join('')}</trk></gpx>`
writeFileSync('tests/fixtures/exemple-lyon.gpx',gpx)
console.log(JSON.stringify(report,null,2))
if(!report.fixture.expectedAllDetected || !fixture.length || !Number.isFinite(lineLength(base)))process.exitCode=1
