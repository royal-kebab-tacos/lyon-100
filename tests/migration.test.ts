import {beforeEach,afterEach,it,expect} from 'vitest'
import {LyonDatabase,ensureNetwork,saveActivity,setCorrection,deleteActivity} from '../src/db/database'
import {exportBackup,validateBackup,restoreBackup} from '../src/db/backup'
import {parseGpx,contentHash,sha256} from '../src/gpx/parse'
import {parseActivity} from '../src/gpx/import'
import {matchSegments} from '../src/gpx/matching'
import {progress} from '../src/stats/progress'
import {readFileSync} from 'node:fs'
import type {Network} from '../src/types'
import {lineLength} from '../src/utils/geometry'
const xml=readFileSync('tests/fixtures/valid.gpx','utf8'),parsed=parseGpx(xml)
const coordinates=parsed.tracks[0].map(p=>p.coordinates)
const network:Network={schemaVersion:1,version:'new',source:'test',sourceDate:'2026-01-01',sourceHash:'a'.repeat(64),generatedAt:'2026-01-01',boundary:{type:'Polygon',coordinates:[]},segments:[{id:'unit',name:'Rue',osmWayId:'1',highway:'residential',coordinates,lengthMeters:lineLength(coordinates),district:1}],totalMeters:lineLength(coordinates)}
let db:LyonDatabase
beforeEach(async()=>{db=new LyonDatabase(crypto.randomUUID());await ensureNetwork(network,db)})
afterEach(async()=>{await db.delete()})
const match=async(tracks:typeof parsed.tracks)=>matchSegments(network.segments,tracks)
async function add(){return (await saveActivity(parsed,'a.gpx',await sha256(xml),await contentHash(parsed),await match(parsed.tracks),network,db))!}
it('reprise après échec de recalcul : aucune ancienne activité n’est modifiée',async()=>{const a=await add();await db.activities.update(a.id,{matchingVersion:'1.0.0'});const before=await db.activities.toArray();await expect(ensureNetwork(network,db,async()=>{throw new Error('simulated failure')})).rejects.toThrow();expect(await db.activities.toArray()).toEqual(before);expect(await ensureNetwork(network,db)).toBe(1)})
it('refuse une migration si un autre onglet a ajouté une sortie pendant le calcul',async()=>{const a=await add();await db.activities.update(a.id,{matchingVersion:'1.0.0'});await expect(ensureNetwork(network,db,async t=>{await db.activities.update(a.id,{name:'Modifiée ailleurs'});return match(t)})).rejects.toThrow(/autre onglet/);expect((await db.activities.get(a.id))?.name).toBe('Modifiée ailleurs')})
it('restaure une sauvegarde ancienne par recalcul des GPS, sans réimport GPX',async()=>{const a=await add();const json=JSON.parse(await exportBackup(network,db));json.schemaVersion=1;json.matchingVersion='1.0.0';json.networkVersion='lyon-v1-old';json.activities=[{...a,matchingVersion:'1.0.0',networkVersion:'lyon-v1-old',coverage:undefined,segmentIds:['obsolete']}];delete json.corrections;const restored=await validateBackup(JSON.stringify(json),network,match);await restoreBackup(restored,network,db);expect((await db.activities.toArray())[0].coverage).toEqual((await match(parsed.tracks)).coverage)})
it('conserve les corrections après recalcul et dans les sauvegardes',async()=>{const a=await add();await setCorrection('unit','remove',network,db);await db.activities.update(a.id,{matchingVersion:'1.0.0'});await ensureNetwork(network,db);expect(progress(network,await db.activities.toArray(),await db.corrections.toArray()).meters).toBe(0);const restored=await validateBackup(await exportBackup(network,db),network,match);await restoreBackup(restored,network,db);expect((await db.corrections.toArray())[0].action).toBe('remove');await deleteActivity(a.id,db);await setCorrection('unit','include',network,db);expect(progress(network,[],await db.corrections.toArray()).percent).toBeCloseTo(100)})
it('préserve les corrections incompatibles au lieu de les oublier',async()=>{await setCorrection('unit','include',network,db);await expect(ensureNetwork({...network,segments:[]},db)).rejects.toThrow(/corrections/);expect(await db.corrections.count()).toBe(1)})
it('la somme des arrondissements égale Lyon',async()=>{const a=await add(),activities=[a];const sum=Array.from({length:9},(_,i)=>progress(network,activities,[],i+1).meters).reduce((a,b)=>a+b,0);expect(sum).toBe(progress(network,activities).meters)})
it('normalise TCX avec timestamps et rejette un TCX invalide',()=>{const text='<TrainingCenterDatabase><Activities><Activity><Lap><Track><Trackpoint><Time>2026-01-01T10:00:00Z</Time><Position><LatitudeDegrees>45.75</LatitudeDegrees><LongitudeDegrees>4.83</LongitudeDegrees></Position></Trackpoint><Trackpoint><Time>2026-01-01T10:00:05Z</Time><Position><LatitudeDegrees>45.7501</LatitudeDegrees><LongitudeDegrees>4.83</LongitudeDegrees></Position></Trackpoint></Track></Lap></Activity></Activities></TrainingCenterDatabase>';const a=parseActivity(text,'run.tcx');expect(a.tracks[0]).toHaveLength(2);expect(a.date).toBe('2026-01-01T10:00:00.000Z');expect(()=>parseActivity('<broken>','x.tcx')).toThrow(/TCX/);expect(()=>parseActivity('','x.fit')).toThrow(/format/);expect(()=>parseActivity('<!DOCTYPE x><x/>','x.tcx')).toThrow(/TCX/)})
it('recalcule une sauvegarde 1.1 au réseau corrigé sans perdre les corrections compatibles',async()=>{await add();await setCorrection('unit','remove',network,db);const json=JSON.parse(await exportBackup(network,db));json.networkVersion='lyon-v2-4615266167e59389';json.matchingVersion='2.0.0';for(const a of json.activities){a.networkVersion=json.networkVersion;a.matchingVersion='2.0.0'};for(const c of json.corrections)c.networkVersion=json.networkVersion;const restored=await validateBackup(JSON.stringify(json),network,match);expect(restored.activities[0].networkVersion).toBe(network.version);expect(restored.corrections[0].networkVersion).toBe(network.version);expect(restored.corrections[0].action).toBe('remove')})
it('restaure malgré les derniers bits différents entre moteurs JavaScript',async()=>{
 await add();const json=JSON.parse(await exportBackup(network,db));
 const pair=json.activities[0].coverage.unit[0];pair[1]-=3e-14;
 const result=await validateBackup(JSON.stringify(json),network,match);
 expect(result.activities).toHaveLength(1);expect(result.activities[0].tracks).toEqual(parsed.tracks)
})
it('refuse toujours une différence réelle de couverture sans modifier la base',async()=>{
 await add();const before=await db.activities.toArray(),json=JSON.parse(await exportBackup(network,db));
 json.activities[0].coverage.unit[0][1]-=.01;
 await expect(validateBackup(JSON.stringify(json),network,match)).rejects.toThrow(/incompatible/);
 expect(await db.activities.toArray()).toEqual(before)
})
it('refuse une fraction non numérique dans une sauvegarde',async()=>{
 await add();const json=JSON.parse(await exportBackup(network,db));json.activities[0].coverage.unit[0][1]=null;
 await expect(validateBackup(JSON.stringify(json),network,match)).rejects.toThrow(/incompatible/)
})

it.each(['2.0.0','2.1.0'])('recalcule une sauvegarde matching %s et conserve ses corrections',async version=>{
 await add();await setCorrection('unit','remove',network,db)
 const json=JSON.parse(await exportBackup(network,db));json.matchingVersion=version
 for(const a of json.activities){a.matchingVersion=version;a.coverage={};a.segmentIds=[];a.newMeters=0;a.newSegments=0}
 const result=await validateBackup(JSON.stringify(json),network,match)
 expect(result.activities[0].matchingVersion).toBe('2.2.0');expect(result.activities[0].coverage).toEqual((await match(parsed.tracks)).coverage)
 expect(result.corrections[0].action).toBe('remove');expect(result.activities[0].newMeters).toBeGreaterThan(0)
})
it('refuse une version future de matching au lieu de la recalculer implicitement',async()=>{
 await add();const json=JSON.parse(await exportBackup(network,db));json.matchingVersion='9.0.0'
 for(const a of json.activities)a.matchingVersion='9.0.0'
 await expect(validateBackup(JSON.stringify(json),network,match)).rejects.toThrow(/incompatible/)
})
