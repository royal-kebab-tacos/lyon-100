import { describe,it,expect } from 'vitest'
import type { Coordinate, Network, Segment, TrackPoint } from '../src/types'
import { lineLength } from '../src/utils/geometry'
import { matchSegments } from '../src/gpx/matching'
import { progress, streetProgress } from '../src/stats/progress'
const coord=(x:number,y=0):Coordinate=>[4.83+x/(111195.08*Math.cos(45.76*Math.PI/180)),45.76+y/111195.08]
const trace=(points:number[][]):TrackPoint[][]=>[points.map(([x,y])=>({coordinates:coord(x,y),time:null}))]
function road(name='Rue A',y=0):Segment[]{return Array.from({length:10},(_,i)=>{const coordinates=[coord(i*10,y),coord((i+1)*10,y)];return {id:`${name}-${i}`,osmWayId:name,name,highway:'residential',coordinates,lengthMeters:lineLength(coordinates)}})}
const network=(segments:Segment[]):Network=>({schemaVersion:1,version:'test',source:'test',sourceDate:'2026-01-01',sourceHash:'a'.repeat(64),generatedAt:'2026-01-01',boundary:{type:'Polygon',coordinates:[]},segments,totalMeters:segments.reduce((sum,s)=>sum+s.lengthMeters,0)})
describe('couverture continue et partielle',()=>{
 it('60 m d’une rue de 100 m restent 60 m verts',()=>{const n=network(road()),m=matchSegments(n.segments,trace([[0,0],[60,0]]));expect(progress(n,[m]).meters).toBeCloseTo(60,1);expect(streetProgress(n,m.coverage!)[0].status).toBe('Partiellement parcourue')})
 it('96 m terminent la rue sans compter les 4 m restants',()=>{const n=network(road()),m=matchSegments(n.segments,trace([[0,0],[96,0]]));expect(progress(n,[m]).meters).toBeCloseTo(96,1);expect(streetProgress(n,m.coverage!)[0].status).toBe('Terminée')})
 it('relie des rues connectées avec un virage et des points espacés',()=>{const a=road(),b=road('Rue B').map((s,i)=>({...s,coordinates:[coord(100,i*10),coord(100,(i+1)*10)]})),n=network([...a,...b]);const m=matchSegments(n.segments,trace([[0,0],[100,0],[100,100]]));expect(progress(n,[m]).meters).toBeGreaterThan(195);expect(m.segmentIds).toHaveLength(20)})
 it('ne valide pas une rue simplement croisée',()=>expect(matchSegments(road(),trace([[50,-40],[50,40]])).segmentIds).toEqual([]))
 it('choisit une seule rue parmi deux parallèles distantes de 8 m',()=>{const m=matchSegments([...road(),...road('Rue B',8)],trace([[0,2],[100,2]]));expect(m.segmentIds.every(id=>id.startsWith('Rue A'))).toBe(true);expect(m.segmentIds).toHaveLength(10)})
 it('accepte un décalage GPS de 6 m',()=>{const n=network(road()),m=matchSegments(n.segments,trace([[0,6],[100,6]]));expect(progress(n,[m]).meters).toBeCloseTo(100,1)})
 it('compte une seconde visite une seule fois',()=>{const n=network(road()),m=matchSegments(n.segments,trace([[0,0],[60,0]]));expect(progress(n,[m,m]).meters).toBeCloseTo(60,1)})
 it('combine les fractions de deux activités à 98 %',()=>{const n=network(road()),a=matchSegments(n.segments,trace([[0,0],[50,0]])),b=matchSegments(n.segments,trace([[50,0],[98,0]])),p=progress(n,[a,b]);expect(p.meters).toBeCloseTo(98,1);expect(streetProgress(n,p.coverage)[0].status).toBe('Terminée')})
 it('une suppression conserve uniquement les portions des autres sorties',()=>{const n=network(road()),a=matchSegments(n.segments,trace([[0,0],[60,0]])),b=matchSegments(n.segments,trace([[40,0],[100,0]]));expect(progress(n,[a,b]).meters).toBeCloseTo(100,1);expect(progress(n,[b]).meters).toBeCloseTo(60,1)})
 it('ne traverse pas une discontinuité entre pistes',()=>{const n=network(road()),m=matchSegments(n.segments,[...trace([[0,0],[20,0]]),...trace([[80,0],[100,0]])]);expect(progress(n,[m]).meters).toBeCloseTo(40,1)})
 it('conserve le bout de rue lors d’un demi-tour',()=>{const n=network(road()),m=matchSegments(n.segments,trace([[0,0],[100,0],[0,0]]));expect(progress(n,[m]).meters).toBeCloseTo(100,1)})
 it('accepte désormais 16 m de décalage soutenu sur une rue isolée',()=>{const n=network(road());expect(progress(n,[matchSegments(n.segments,trace([[0,16],[100,16]]))]).meters).toBeCloseTo(100,1)})
 it('respecte les corrections et retire les exclusions du dénominateur',()=>{const n=network(road()),m=matchSegments(n.segments,trace([[0,0],[100,0]])),p=progress(n,[m],[{segmentId:'Rue A-0',action:'remove',networkVersion:'test',updatedAt:'2026-01-01'},{segmentId:'Rue A-1',action:'exclude',networkVersion:'test',updatedAt:'2026-01-01'}]);expect(p.totalMeters).toBeCloseTo(90,1);expect(p.meters).toBeCloseTo(80,1)})
})


describe('rues larges : marge conditionnelle, jamais validation de voisinage',()=>{
 it.each([18,-18,24,-24])('compte le trottoir décalé de %s m, sans gonfler la longueur',y=>{const n=network(road());expect(progress(n,[matchSegments(n.segments,trace([[0,y],[100,y]]))]).meters).toBeCloseTo(100,1)})
 it('ne valide que la portion longitudinale suivie',()=>{const n=network(road());expect(progress(n,[matchSegments(n.segments,trace([[20,20],[80,20]]))]).meters).toBeCloseTo(60,1)})
 it('refuse au-delà de 25 m',()=>expect(matchSegments(road(),trace([[0,26],[100,26]])).segmentIds).toEqual([]))
 it('ne valide pas un passage court ni des allers-retours sur 20 m',()=>{expect(matchSegments(road(),trace([[0,20],[20,20]])).segmentIds).toEqual([]);expect(matchSegments(road(),trace([[0,20],[20,20],[0,20],[20,20]])).segmentIds).toEqual([])})
 it('ne cumule pas deux pistes courtes pour atteindre le seuil',()=>expect(matchSegments(road(),[...trace([[0,20],[20,20]]),...trace([[60,20],[80,20]])]).segmentIds).toEqual([]))
 it('refuse un passage oblique et un croisement',()=>{expect(matchSegments(road(),trace([[0,16],[20,24]])).segmentIds).toEqual([]);expect(matchSegments(road(),trace([[50,-35],[50,35]])).segmentIds).toEqual([])})
 it('ne propage pas la couverture à une rue parallèle proche',()=>{const m=matchSegments([...road(),...road('Voisine',24)],trace([[0,2],[100,2]]));expect(m.segmentIds).toHaveLength(10);expect(m.segmentIds.every(id=>id.startsWith('Rue A'))).toBe(true)})
 it('laisse une trace entre deux corridors concurrents à vérifier',()=>expect(matchSegments([...road(),...road('Voisine',40)],trace([[0,20],[100,20]])).segmentIds).toEqual([]))
 it('détecte aussi une concurrente juste au-delà du rayon étendu',()=>expect(matchSegments([...road(),...road('Voisine',52)],trace([[0,24],[100,24]])).segmentIds).toEqual([]))
 it('un même nom ne fusionne pas deux chaussées parallèles',()=>{const b=road('Rue A',40).map(s=>({...s,id:`b-${s.id}`}));expect(matchSegments([...road(),...b],trace([[0,20],[100,20]])).segmentIds).toEqual([])})
 it('ne dilate pas les allées de parc et chemins indépendants',()=>expect(matchSegments(road().map(s=>({...s,highway:'path'})),trace([[0,20],[100,20]])).segmentIds).toEqual([]))
 it('un pont isolé est admissible, un autre niveau concurrent bloque l’extension',()=>{const bridge=road().map(s=>({...s,bridge:'yes',layer:'1'}));expect(matchSegments(bridge,trace([[0,20],[100,20]])).segmentIds).toHaveLength(10);const lower=road().map(s=>({...s,id:`lower-${s.id}`,layer:'0'}));expect(matchSegments([...bridge,...lower],trace([[0,20],[100,20]])).segmentIds).toEqual([])})
})
it('préserve les portions proches lors d’une entrée et sortie de la marge élargie',()=>{
 const n=network(road()),t=trace([[0,0],[24,0],[40,20],[60,20],[76,0],[100,0]])
 const m=matchSegments(n.segments,t)
 expect(m.coverage?.['Rue A-0']).toEqual([[0,1]])
 expect(m.coverage?.['Rue A-9']?.[0][1]).toBeCloseTo(1)
})
