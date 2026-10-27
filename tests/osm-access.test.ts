import {it,expect} from 'vitest'
import {eligible,removeRedundantSidewalks} from '../scripts/prepare'
import type {Segment,Coordinate} from '../src/types'
const coord=(x:number,y:number):Coordinate=>[4.83+x/(111195.08*Math.cos(45.76*Math.PI/180)),45.76+y/111195.08]
const unit=(id:string,y:number,highway:string,extra:Partial<Segment>={}):Segment=>({id,osmWayId:id,name:'Test',highway,lengthMeters:10,coordinates:[coord(0,y),coord(10,y)],layer:'0',bridge:'no',...extra})
it('ne perd pas une rue avec trottoir obligatoire',()=>expect(eligible({highway:'residential',foot:'use_sidepath'})).toBe(true))
it('respecte l’autorisation piétonne spécifique comme rue de la République',()=>expect(eligible({highway:'pedestrian',access:'no',foot:'yes'})).toBe(true))
it('conserve les interdictions réelles et ne valide pas une piste interdite à pied',()=>{expect(eligible({highway:'residential',access:'private'})).toBe(false);expect(eligible({highway:'cycleway',access:'yes',foot:'no'})).toBe(false)})
it('ne supprime plus systématiquement les trottoirs',()=>expect(eligible({highway:'footway',footway:'sidewalk'})).toBe(true))
it('évite le double objectif rue et trottoir proche parallèle',()=>{const a=unit('street',0,'residential'),b=unit('sidewalk',5,'footway',{footway:'sidewalk'});expect(removeRedundantSidewalks([a,b]).map(s=>s.id)).toEqual(['street'])})
it('garde un trottoir sans axe représentatif proche',()=>{const a=unit('street',0,'residential'),b=unit('sidewalk',20,'footway',{footway:'sidewalk'});expect(removeRedundantSidewalks([a,b])).toHaveLength(2);expect(removeRedundantSidewalks([b])).toHaveLength(1)})
it('ne confond pas deux niveaux superposés',()=>{const a=unit('street',0,'residential',{layer:'1',bridge:'yes'}),b=unit('sidewalk',5,'footway',{footway:'sidewalk'});expect(removeRedundantSidewalks([a,b])).toHaveLength(2)})
it('le réseau livré contient les axes piétons manquants de Guillotière et République',async()=>{const {readFileSync}=await import('node:fs');const n=JSON.parse(readFileSync('public/data/lyon-network.json','utf8'));for(const id of ['369948206','258137454','186742300'])expect(n.segments.some((s:Segment)=>s.osmWayId===id)).toBe(true)})
