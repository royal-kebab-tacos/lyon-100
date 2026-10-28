import {it,expect} from 'vitest'
import {bridgeGap,type ContinuityRoad} from '../src/gpx/continuity'
import {matchSegments} from '../src/gpx/matching'
import {progress} from '../src/stats/progress'
import {lineLength} from '../src/utils/geometry'
import type {Coordinate,Segment,Network,TrackPoint} from '../src/types'
const point=(x:number,y=0):Coordinate=>[4.83+x/(111195.08*Math.cos(45.76*Math.PI/180)),45.76+y/111195.08]
function road(i:number,a:Coordinate,b:Coordinate,name='',layer='0'):ContinuityRoad{
 const length=Math.hypot(b[0]-a[0],b[1]-a[1])
 return {segment:{id:`s${i}`,osmWayId:`way${i}`,name,highway:'footway',layer,coordinates:[point(...a),point(...b)],lengthMeters:length},points:[a,b],cumulative:[0,length],length,start:a.join(','),end:b.join(',')}
}
const line=(name='')=>Array.from({length:6},(_,i)=>road(i,[i*10,0],[(i+1)*10,0],name))
function graph(roads:ContinuityRoad[]){const adj=new Map<string,{road:number;end:string;reverse:boolean}[]>();roads.forEach((r,i)=>{adj.set(r.start,[...(adj.get(r.start)||[]),{road:i,end:r.end,reverse:false}]);adj.set(r.end,[...(adj.get(r.end)||[]),{road:i,end:r.start,reverse:true}])});return adj}
const gps:Coordinate[]=[[20,0],[25,16],[30,20],[35,16],[40,0]]
const close=(rs:ContinuityRoad[],trace=gps)=>bridgeGap(rs,graph(rs),{road:1,t:1},{road:4,t:0},trace)
it('raccorde deux voies sans nom par un chemin réel court malgré un décalage GPS',()=>expect(close(line()).map(p=>p.road)).toEqual([1,2,3,4]))
it('raccorde une rue nommée sans élargir sa couverture latérale',()=>expect(close(line('Quai')).map(p=>p.road)).toEqual([1,2,3,4]))
it('ne fusionne pas une rue nommée avec une voie sans nom',()=>{const rs=line();rs[3].segment.name='Autre rue';expect(close(rs)).toEqual([])})
it('ne fusionne pas deux rues de noms différents',()=>{const rs=line('Quai');rs[4].segment.name='Rue B';expect(close(rs)).toEqual([])})
it('refuse deux chemins possibles même sans noms',()=>{const rs=[...line(),road(6,[20,0],[30,5]),road(7,[30,5],[40,0])];expect(close(rs)).toEqual([])})
it('ne crée pas un raccordement entre extrémités seulement proches',()=>{const rs=line();rs[3].start='unconnected';expect(close(rs)).toEqual([])})
it('refuse un autre niveau et un détour GPS réel',()=>{const rs=line();rs[3].segment.layer='1';expect(close(rs)).toEqual([]);expect(close(line(),[[20,0],[30,40],[40,0]])).toEqual([])})
it('ne comble pas un trou de plus de 40 m',()=>{const rs=Array.from({length:10},(_,i)=>road(i,[i*10,0],[(i+1)*10,0]));expect(bridgeGap(rs,graph(rs),{road:0,t:1},{road:7,t:0},[[10,0],[70,0]])).toEqual([])})
it('conserve les fractions des portions d’ancrage',()=>{const rs=line();const result=bridgeGap(rs,graph(rs),{road:1,t:.6},{road:4,t:.4},[[16,0],[30,20],[44,0]]);expect(result[0].range).toEqual([.6,1]);expect(result.at(-1)!.range).toEqual([0,.4])})
function fixture(){const segments:Array<Segment>=Array.from({length:10},(_,i)=>{const coordinates=[point(i*10),point((i+1)*10)];return {id:`s${i}`,osmWayId:`way${i}`,name:'',highway:'footway',coordinates,lengthMeters:lineLength(coordinates)}});const network={segments,totalMeters:100} as Network;return {segments,network}}
const track=(pairs:Coordinate[]):TrackPoint[]=>pairs.map(([x,y])=>({coordinates:point(x,y),time:null}))
it('intègre le raccordement entre deux passages reconnus dans la même sortie',()=>{const {segments,network}=fixture();const m=matchSegments(segments,[track([[0,0],[32,0],[40,20],[48,20],[56,0],[100,0]])]);expect(progress(network,[m]).meters).toBeCloseTo(100,1)})
it('ne remplit pas entre deux pistes distinctes',()=>{const {segments,network}=fixture();expect(progress(network,[matchSegments(segments,[track([[0,0],[32,0]]),track([[56,0],[100,0]])])]).meters).toBeCloseTo(76,1)})
it('ne remplit pas entre deux activités distinctes',()=>{const {segments,network}=fixture();expect(progress(network,[matchSegments(segments,[track([[0,0],[32,0]])]),matchSegments(segments,[track([[56,0],[100,0]])])]).meters).toBeCloseTo(76,1)})
it('ne remplit pas une interruption temporelle dans une piste brute',()=>{const {segments,network}=fixture();const t=track([[0,0],[32,0],[56,0],[100,0]]);t.forEach((p,i)=>p.time=new Date(Date.UTC(2026,0,1,0,i<2?0:5,i%2*10)).toISOString());expect(progress(network,[matchSegments(segments,[t])]).meters).toBeCloseTo(76,1)})

it('un autre itinéraire de nom différent empêche aussi le raccordement automatique',()=>{
 const rs=[...line('Quai'),road(6,[20,0],[30,5],'Allée'),road(7,[30,5],[40,0],'Allée')]
 expect(close(rs)).toEqual([])
})
