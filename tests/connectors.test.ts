import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {prepareConnectors} from '../scripts/prepare-connectors'
import {matchSegments} from '../src/gpx/matching'
import {progress,contribution} from '../src/stats/progress'
import {createRenderGeometry} from '../src/map/renderGeometry'
import {LyonDatabase,ensureNetwork,saveActivity} from '../src/db/database'
import {exportBackup,validateBackup} from '../src/db/backup'
import {contentHash,sha256} from '../src/gpx/parse'
import {tracksLength} from '../src/utils/geometry'
import type {Network,Segment,Coordinate,TrackPoint} from '../src/types'
const point=(x:number):Coordinate=>[4.83+x/(111195.08*Math.cos(45.76*Math.PI/180)),45.76]
const seg=(id:string,a:number,b:number,connector=false):Segment=>({id,connector,osmWayId:id,name:'',highway:'footway',coordinates:[point(a),point(b)],lengthMeters:b-a,startNode:String(a),endNode:String(b)})
const segments=[seg('a0',0,10),seg('a1',10,20),seg('a2',20,30),seg('b0',40,50),seg('b1',50,60),seg('b2',60,70)],connectors=[seg('connector:c',30,40,true)]
const network:Network={schemaVersion:1,version:'test',source:'OSM',sourceHash:'a'.repeat(64),sourceDate:'2026-01-01',generatedAt:'2026-01-01',boundary:{type:'Polygon',coordinates:[]},segments,connectors,totalMeters:60}
const tracks:TrackPoint[][]=[[{coordinates:point(0),time:null},{coordinates:point(70),time:null}]]
const match=async(t:TrackPoint[][])=>matchSegments([...segments,...connectors],t)
it('reconnaît une traversée réelle sans l’ajouter à l’objectif ni aux nouveaux kilomètres',async()=>{
 const result=await match(tracks);expect(result.segmentIds).toContain('connector:c')
 expect(progress(network,[result]).meters).toBeCloseTo(60);expect(progress(network,[result]).totalMeters).toBe(60)
 expect(contribution(segments,result.segmentIds,{},result.coverage).newSegments).toBe(6)
})
it('dessine seulement la partie parcourue des liaisons techniques',()=>{
 const draw=createRenderGeometry({'connector:c':[[.2,.8]]}),layers=draw(connectors,new Set(),0,'Toutes')
 expect(layers.remaining).toHaveLength(0);expect(layers.done).toHaveLength(1)
 expect(createRenderGeometry({})(connectors,new Set(),0,'Toutes').done).toHaveLength(0)
 expect(draw(connectors,new Set(),0,'Restantes').done).toHaveLength(0)
})
it('sauvegarde et restaure les traversées reconnues, sans autoriser les corrections sur celles-ci',async()=>{
 const db=new LyonDatabase(crypto.randomUUID())
 try{await ensureNetwork(network,db);const parsed={name:'Traversée synthétique',date:null,tracks,distanceMeters:tracksLength(tracks),gaps:0}
 await saveActivity(parsed,'test.gpx',await sha256('synthetic'),await contentHash(parsed),await match(tracks),network,db)
 const restored=await validateBackup(await exportBackup(network,db),network,match)
 expect(restored.activities[0].coverage?.['connector:c']).toBeDefined();expect(progress(network,restored.activities).percent).toBeCloseTo(100)
 const bad=JSON.parse(await exportBackup(network,db));bad.corrections=[{segmentId:'connector:c',action:'include',networkVersion:'test',updatedAt:'2026-01-01'}]
 await expect(validateBackup(JSON.stringify(bad),network,match)).rejects.toThrow(/incompatible/)
 }finally{await db.delete()}
})
it('prépare les passages publics mais exclut les traversées privées et interdites',()=>{
 const boundary:Network['boundary']={type:'Polygon',coordinates:[[[4.8,45.7],[4.9,45.7],[4.9,45.8],[4.8,45.8],[4.8,45.7]]]}
 const permissions:Record<string,string>[]=[{}, {access:'private'},{foot:'no'},{access:'private',foot:'yes'}]
 const ways=permissions.map((tags,i)=>({id:String(i),tags:{highway:'footway',footway:'crossing',...tags},nodes:[String(i*2),String(i*2+1)],coordinates:[point(i*20),point(i*20+8)]}))
 const result=prepareConnectors({boundary,ways,source:'test',sourceDate:'2026-01-01'})
 expect(new Set(result.map(s=>s.osmWayId))).toEqual(new Set(['0','3']));expect(result.every(s=>s.connector&&s.id.startsWith('connector:'))).toBe(true)
})
it('rétablit le passage piéton OSM 1304453497 à l’entrée du pont Gallieni',()=>{
 const file=JSON.parse(readFileSync('public/data/lyon-connectors.json','utf8')),roads:Segment[]=file.connectors
 const crossing=roads.filter(s=>s.osmWayId==='1304453497')
 expect(crossing.length).toBeGreaterThan(0);expect(crossing.reduce((n,s)=>n+s.lengthMeters,0)).toBeGreaterThan(7)
 expect(crossing.every(s=>s.footway==='crossing')).toBe(true)
})
