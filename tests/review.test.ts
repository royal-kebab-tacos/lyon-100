import { describe,it,expect,beforeEach,afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { diagnose } from '../src/review/diagnostics'
import { ignoreReview,clearIgnoredReviews } from '../src/review/storage'
import { LyonDatabase,ensureNetwork,saveActivity,deleteActivity,resetData,setCorrection } from '../src/db/database'
import { exportBackup,validateBackup,restoreBackup } from '../src/db/backup'
import { parseGpx,sha256,contentHash } from '../src/gpx/parse'
import { matchSegments } from '../src/gpx/matching'
import { lineLength } from '../src/utils/geometry'
import type { Coordinate,Segment,TrackPoint,Network } from '../src/types'
const sx=111195.08*Math.cos(45.76*Math.PI/180)
const point=(x:number,y:number):Coordinate=>[4.83+x/sx,45.76+y/111195.08]
const road=(id:string,y=0,x=0,length=100):Segment=>({id,osmWayId:id,name:id,highway:'residential',coordinates:[point(x,y),point(x+length,y)],lengthMeters:length})
const track=(y=0):TrackPoint[]=>Array.from({length:11},(_,i)=>({coordinates:point(i*10,y),time:null}))
describe('optional GPS hints',()=>{
 it('flags a sustained offset without changing matching coverage',()=>{const s=[road('a')],t=[track(18)];const before=matchSegments(s,t);expect(diagnose(s,t).suggestions).toEqual([expect.objectContaining({segmentId:'a',reason:'offset'})]);expect(matchSegments(s,t)).toEqual(before);expect(before.segmentIds).toEqual(['a'])})
 it('flags two plausible parallel ways',()=>{const r=diagnose([road('a'),road('b',10)],[track(5)]);expect(r.suggestions.map(s=>s.segmentId).sort()).toEqual(['a','b']);expect(r.suggestions.every(s=>s.reason==='parallel')).toBe(true)})
 it('does not mistake consecutive collinear ways for parallel ambiguity',()=>{expect(diagnose([road('a',0,0,50),road('b',0,50,50)],[track()]).suggestions).toEqual([])})
 it('does not flag a distant parallel road when a clear close road matches',()=>{expect(diagnose([road('a'),road('b',20)],[track()]).suggestions).toEqual([])})
 it('does not flag two secondary candidates when one road is clearly closest',()=>{expect(diagnose([road('a'),road('b',8),road('c',-10)],[track()]).suggestions).toEqual([])})
 it('rejects a perpendicular crossing and a far-away trace',()=>{const crossing=[{coordinates:point(50,-50),time:null},{coordinates:point(50,50),time:null}];expect(diagnose([road('a')],[crossing]).suggestions).toEqual([]);expect(diagnose([road('a')],[track(30)]).suggestions).toEqual([])})
 it('requires longitudinal evidence, not a nearby single point',()=>{expect(diagnose([road('a')],[[{coordinates:point(20,18),time:null}]]).suggestions).toEqual([])})
 it('never connects separate tracks or long jumps',()=>{expect(diagnose([road('a')],[[{coordinates:point(20,18),time:null}],[{coordinates:point(80,18),time:null}]]).suggestions).toEqual([]);expect(diagnose([road('a')],[[{coordinates:point(-100,18),time:null},{coordinates:point(300,18),time:null}]]).suggestions).toEqual([])})
})
describe('review decisions and compatible backups',()=>{
 let db:LyonDatabase
 const xml=readFileSync('tests/fixtures/valid.gpx','utf8'),parsed=parseGpx(xml),coordinates=parsed.tracks[0].map(p=>p.coordinates)
 const network:Network={schemaVersion:1,version:'test',source:'test',sourceDate:'2026-01-01',sourceHash:'a'.repeat(64),generatedAt:'2026-01-01',boundary:{type:'Polygon',coordinates:[]},segments:[{...road('unit'),coordinates,lengthMeters:lineLength(coordinates)}],totalMeters:lineLength(coordinates)}
 const match=async(tracks:TrackPoint[][])=>matchSegments(network.segments,tracks)
 const add=async()=> (await saveActivity(parsed,'a.gpx',await sha256(xml),await contentHash(parsed),await match(parsed.tracks),network,db))!
 beforeEach(async()=>{db=new LyonDatabase(crypto.randomUUID());await ensureNetwork(network,db)})
 afterEach(async()=>{await db.delete()})
 it('ignores persistently without changing activities or corrections, and can undo',async()=>{const a=await add();await Promise.all([ignoreReview(a.id,'unit',network.version,db),ignoreReview(a.id,'unit',network.version,db)]);expect((await db.settings.get('reviewIgnored'))?.value).toHaveLength(1);expect(await db.activities.get(a.id)).toEqual(a);expect(await db.corrections.count()).toBe(0);await clearIgnoredReviews(a.id,db);expect((await db.settings.get('reviewIgnored'))?.value).toEqual([])})
 it('roundtrips ignores and manual corrections with the full backup',async()=>{const a=await add();await ignoreReview(a.id,'unit',network.version,db);await setCorrection('unit','remove',network,db);const restored=await validateBackup(await exportBackup(network,db),network,match);expect(restored.reviewIgnored).toHaveLength(1);await resetData(db);await restoreBackup(restored,network,db);expect((await db.settings.get('reviewIgnored'))?.value).toEqual(restored.reviewIgnored);expect((await db.corrections.toArray())[0].action).toBe('remove')})
 it('accepts older backups without the optional field and clears previous ignored choices',async()=>{const a=await add();const backup=JSON.parse(await exportBackup(network,db));delete backup.reviewIgnored;await ignoreReview(a.id,'unit',network.version,db);await restoreBackup(await validateBackup(JSON.stringify(backup),network,match),network,db);expect((await db.settings.get('reviewIgnored'))?.value).toEqual([])})
 it('rejects forged and duplicate ignores without modifying current data',async()=>{const a=await add();await ignoreReview(a.id,'unit',network.version,db);const backup=JSON.parse(await exportBackup(network,db));backup.reviewIgnored[0].activityId='missing';await expect(validateBackup(JSON.stringify(backup),network,match)).rejects.toThrow(/incompatible/);expect(await db.activities.get(a.id)).toEqual(a);backup.reviewIgnored[0].activityId=a.id;backup.reviewIgnored.push(backup.reviewIgnored[0]);await expect(validateBackup(JSON.stringify(backup),network,match)).rejects.toThrow(/incompatible/)})
 it('deleting a session cleans ignored decisions, and reset clears all decisions',async()=>{const a=await add();await ignoreReview(a.id,'unit',network.version,db);await deleteActivity(a.id,db);expect((await db.settings.get('reviewIgnored'))?.value).toEqual([]);const b=await add();await ignoreReview(b.id,'unit',network.version,db);await resetData(db);expect(await db.settings.get('reviewIgnored')).toBeUndefined()})
 it('rolls back ignored decisions if restoring activities fails',async()=>{const a=await add();await ignoreReview(a.id,'unit',network.version,db);const before=(await db.settings.get('reviewIgnored'))?.value;await expect(restoreBackup({activities:[a,a],corrections:[],reviewIgnored:[]},network,db)).rejects.toThrow();expect((await db.settings.get('reviewIgnored'))?.value).toEqual(before)})
 it('rejects ignores after deletion or incompatible network',async()=>{const a=await add();await expect(ignoreReview(a.id,'unit','other',db)).rejects.toThrow();await deleteActivity(a.id,db);await expect(ignoreReview(a.id,'unit',network.version,db)).rejects.toThrow()})
})
