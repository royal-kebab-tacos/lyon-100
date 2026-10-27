import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseGpx, sha256, contentHash } from '../src/gpx/parse'
import { lineLength } from '../src/utils/geometry'
import { matchSegments } from '../src/gpx/matching'
import { progress, streetProgress } from '../src/stats/progress'
import { LyonDatabase, ensureNetwork, saveActivity, deleteActivity, resetData } from '../src/db/database'
import { exportBackup, validateBackup, restoreBackup } from '../src/db/backup'
import { clipLine, eligible, prepareNetwork } from '../scripts/prepare'
import type { Coordinate, Network, Segment, TrackPoint } from '../src/types'
const xml = readFileSync('tests/fixtures/valid.gpx', 'utf8')
const coords: Coordinate[] = [[4.8351,45.7578],[4.8351,45.75824966]]
const segment: Segment = { id:'s1',osmWayId:'1',name:'Rue test',highway:'residential',coordinates:coords,lengthMeters:lineLength(coords) }
const segment2: Segment = { ...segment,id:'s2',name:'Rue encore' }
const boundary: Network['boundary'] = {type:'Polygon',coordinates:[[[4.7,45.6],[5,45.6],[5,46],[4.7,46],[4.7,45.6]]]}
const network: Network = {schemaVersion:1,version:'test',generatedAt:'2026-10-01',source:'test',sourceDate:'2026-10-01',sourceHash:'a'.repeat(64),boundary,segments:[segment,segment2],totalMeters:segment.lengthMeters*2}
const points = (line: Coordinate[]): TrackPoint[] => line.map(coordinates=>({coordinates,time:null}))
const match = async (tracks: TrackPoint[][]) => matchSegments(network.segments,tracks)
let database: LyonDatabase
beforeEach(async()=>{database=new LyonDatabase(`test-${crypto.randomUUID()}`);await ensureNetwork(network,database)})
afterEach(async()=>{await database.delete()})
async function add(ids=['s1'], suffix='') {
 const parsed=parseGpx(xml.replaceAll('2026-10-01',suffix || '2026-10-01'))
 return saveActivity(parsed,'test.gpx',await sha256(xml+suffix),await contentHash(parsed),ids,network,database)
}
describe('GPX',()=>{
 it('lit coordonnées, date, nom et distance',()=>{const a=parseGpx(xml);expect(a.name).toBe('Test synthétique Lyon');expect(a.tracks[0]).toHaveLength(3);expect(a.date).toBe('2026-10-01T10:00:00.000Z');expect(a.distanceMeters).toBeGreaterThan(60)})
 it.each(['pas du XML','<gpx><trk>','<gpx/>','<!DOCTYPE gpx [<!ENTITY x "a">]><gpx/>','<notgpx/>'])('rejette proprement %s',input=>expect(()=>parseGpx(input)).toThrow(/GPX valide/))
 it('ne relie jamais deux trkseg',()=>{const a=parseGpx('<gpx><trk><trkseg><trkpt lat="45.75" lon="4.83"/><trkpt lat="45.7501" lon="4.83"/></trkseg><trkseg><trkpt lat="45.76" lon="4.83"/><trkpt lat="45.7601" lon="4.83"/></trkseg></trk></gpx>');expect(a.tracks).toHaveLength(2);expect(a.distanceMeters).toBeLessThan(23)})
 it('coupe à une coordonnée invalide sans joindre les voisins',()=>{const a=parseGpx('<gpx><trk><trkseg><trkpt lat="45.75" lon="4.83"/><trkpt lat="45.7501" lon="4.83"/><trkpt lat="NaN" lon="4.83"/><trkpt lat="45.76" lon="4.83"/><trkpt lat="45.7601" lon="4.83"/></trkseg></trk></gpx>');expect(a.tracks).toHaveLength(2);expect(a.gaps).toBe(1)})
 it('accepte une route sans date',()=>{const a=parseGpx('<gpx><rte><name>Balade</name><rtept lat="45.75" lon="4.83"/><rtept lat="45.7501" lon="4.83"/></rte></gpx>');expect(a.name).toBe('Balade');expect(a.date).toBeNull()})
 it('ignore les grands sauts GPS',()=>{const a=parseGpx(xml.replace('</trkseg>','<trkpt lat="46" lon="5"/><trkpt lat="46.0001" lon="5"/></trkseg>'));expect(a.gaps).toBe(1);expect(a.tracks).toHaveLength(2)})
 it('déduplique les points répétés',()=>expect(parseGpx(xml.replace('</trkseg>','<trkpt lat="45.75840" lon="4.83510"/></trkseg>')).tracks[0]).toHaveLength(3))
})
describe('géométrie et matching',()=>{
 it('mesure une longueur géodésique en mètres',()=>expect(segment.lengthMeters).toBeCloseTo(50,1))
 it('le filtre spatial préserve une correspondance exacte',()=>expect(matchSegments([segment],[points(coords)]).segmentIds).toEqual(['s1']))
 it('ignore une trace hors Lyon',()=>expect(matchSegments([segment],[points([[2,48],[2,48.001]])]).segmentIds).toEqual([]))
})
describe('persistance et progression',()=>{
 it('ignore le même GPX avec un autre nom',async()=>{expect(await add()).not.toBeNull();expect(await add()).toBeNull();expect(await database.activities.count()).toBe(1)})
 it('ignore un XML réencodé avec mêmes points',async()=>{await add();const parsed=parseGpx(xml.replace('creator="Lyon 100 tests"','creator="Autre outil"'));expect(await saveActivity(parsed,'autre.gpx',await sha256('different'),await contentHash(parsed),['s1'],network,database)).toBeNull()})
 it('accepte une vraie deuxième date sur le même trajet sans gonfler la couverture',async()=>{await add();await add(['s1'],'2026-10-02');const p=progress(network,await database.activities.toArray());expect(p.activities).toBe(2);expect(p.percent).toBe(50)})
 it('conserve les segments communs après suppression',async()=>{const a=await add(['s1','s2']);await add(['s2'],'2026-10-02');await deleteActivity(a!.id,database);const p=progress(network,await database.activities.toArray());expect([...p.covered]).toEqual(['s2']);expect(p.percent).toBe(50)})
 it('calcule 0, 50 et 100 % sans doubler',()=>{expect(progress(network,[]).percent).toBe(0);expect(progress(network,[{segmentIds:['s1']},{segmentIds:['s1']}]).percent).toBe(50);expect(progress(network,[{segmentIds:['s1','s2']}]).remainingMeters).toBe(0)})
 it('calcule les nouveaux segments par rapport à l’union',async()=>{await add(['s1']);const b=await add(['s1','s2'],'2026-10-02');expect(b?.newSegments).toBe(1);expect(b?.newMeters).toBe(segment2.lengthMeters)})
 it('regroupe correctement les rues nommées',()=>{const rows=streetProgress(network,new Set(['s1']));expect(rows.find(s=>s.name==='Rue test')?.doneCount).toBe(1)})
 it('recalcule automatiquement après changement de réseau sans perdre la trace',async()=>{const a=await add();await ensureNetwork({...network,version:'autre'},database);const b=await database.activities.get(a!.id);expect(b?.networkVersion).toBe('autre');expect(b?.tracks).toEqual(a?.tracks);expect(await database.recovery.count()).toBe(1)})
 it('résiste à des imports simultanés',async()=>{const results=await Promise.all([add(),add()]);expect(results.filter(Boolean)).toHaveLength(1)})
 it('recalcule une ancienne version d’algorithme',async()=>{const a=await add();await database.activities.update(a!.id,{matchingVersion:'1.0.0'});expect(await ensureNetwork(network,database)).toBe(1);expect((await database.activities.get(a!.id))?.coverage).toBeDefined()})
 it('réinitialise les activités',async()=>{await add();await resetData(database);expect(await database.activities.count()).toBe(0)})
})
describe('sauvegarde',()=>{
 it('exporte et restaure activités, traces et couverture',async()=>{const a=parseGpx(xml);await saveActivity(a,'a.gpx',await sha256(xml),await contentHash(a),await match(a.tracks),network,database);const json=await exportBackup(network,database);const restored=await validateBackup(json,network,match);await resetData(database);await restoreBackup(restored,network,database);expect(await database.activities.count()).toBe(1);expect(progress(network,await database.activities.toArray()).percent).toBeCloseTo(50)})
 it('refuse JSON invalide ou réseau incompatible sans mutation',async()=>{await add();await expect(validateBackup('{',network,match)).rejects.toThrow(/sauvegarde/);const b=JSON.parse(await exportBackup(network,database));b.networkVersion='autre';await expect(validateBackup(JSON.stringify(b),network,match)).rejects.toThrow(/incompatible/);expect(await database.activities.count()).toBe(1)})
 it('refuse une couverture falsifiée',async()=>{await add(['s1']);await expect(validateBackup(await exportBackup(network,database),network,match)).rejects.toThrow(/incompatible/)})
 it('annule atomiquement une restauration en échec',async()=>{const a=await add();await expect(restoreBackup([a!,a!],network,database)).rejects.toThrow();expect(await database.activities.count()).toBe(1)})
})
describe('préparation OSM',()=>{
 it('respecte accès piéton et services publics',()=>{expect(eligible({highway:'residential',access:'private'})).toBe(false);expect(eligible({highway:'residential',access:'private',foot:'yes'})).toBe(true);expect(eligible({highway:'service'})).toBe(false);expect(eligible({highway:'service',access:'yes',service:'parking_aisle'})).toBe(false);expect(eligible({highway:'footway',foot:'yes'})).toBe(true);expect(eligible({highway:'service',foot:'yes'})).toBe(true)})
 it('découpe à la frontière plutôt qu’à la boîte globale',()=>{const polygon:Network['boundary']={type:'Polygon',coordinates:[[[4.83,45.75],[4.84,45.75],[4.84,45.76],[4.83,45.76],[4.83,45.75]]]};const clipped=clipLine([[4.82,45.755],[4.85,45.755]],polygon);expect(clipped).toHaveLength(1);expect(clipped[0][0][0]).toBeCloseTo(4.83);expect(clipped[0].at(-1)![0]).toBeCloseTo(4.84)})
 it('produit des identifiants stables et élimine les doublons inversés',()=>{const raw={boundary,source:'test',sourceDate:'2026-10-01',ways:[{id:'1',tags:{highway:'residential'},nodes:['1','2'],coordinates:coords},{id:'2',tags:{highway:'residential'},nodes:['2','1'],coordinates:[...coords].reverse()}]};const a=prepareNetwork(raw),b=prepareNetwork(raw);expect(a.segments.map(s=>s.id)).toEqual(b.segments.map(s=>s.id));expect(a.totalMeters).toBeCloseTo(50,1);expect(a.segments.every(s=>s.lengthMeters<=10.01)).toBe(true)})
})

describe('réseau livré et seuils',()=>{
 it('livre un vrai réseau cohérent, borné et sans identifiants répétés',()=>{
   const real:Network=JSON.parse(readFileSync('public/data/lyon-network.json','utf8'))
   expect(real.source).toContain('OpenStreetMap')
   expect(real.segments.length).toBeGreaterThan(10_000)
   expect(real.totalMeters).toBeGreaterThan(400_000)
   expect(real.totalMeters).toBeLessThan(1_500_000)
   expect(new Set(real.segments.map(s=>s.id)).size).toBe(real.segments.length)
   expect(real.segments.every(s=>s.lengthMeters>0 && s.lengthMeters<=10.05)).toBe(true)
   expect(real.segments.reduce((sum,s)=>sum+s.lengthMeters,0)).toBeCloseTo(real.totalMeters,5)
 })
 it('retire un trou de la frontière communale',()=>{
   const polygon:Network['boundary']={type:'Polygon',coordinates:[[[4.83,45.75],[4.84,45.75],[4.84,45.76],[4.83,45.76],[4.83,45.75]],[[4.834,45.754],[4.836,45.754],[4.836,45.756],[4.834,45.756],[4.834,45.754]]]}
   expect(clipLine([[4.832,45.755],[4.838,45.755]],polygon)).toHaveLength(2)
 })
})
