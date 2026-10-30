import type {Interval,Segment} from '../types'
import {fraction} from '../stats/progress'
const meters=(n:number)=>n>1e-8&&n<.1?'moins de 0,1':n.toLocaleString('fr-FR',{maximumFractionDigits:1})
export function PortionCoverage({segment,ranges,excluded=false}:{segment:Segment;ranges?:Interval[];excluded?:boolean}){
 const covered=segment.lengthMeters*fraction(ranges),remaining=Math.max(0,segment.lengthMeters-covered)
 return <div className="portion-coverage"><p>Portion sélectionnée : {meters(segment.lengthMeters)} m.{excluded?' Exclue de votre objectif.':<> <strong>{meters(covered)} m parcourus</strong> · {meters(remaining)} m restants.</>} La correction concerne uniquement ce petit trait bleu.</p>
 <details><summary>Pourquoi un petit morceau reste gris ?</summary><p>Le vert suit les portions de chemins reconnues dans vos traces GPS. Une place ou un parc peut contenir plusieurs chemins distincts sur la carte : passer dans la zone ne valide pas toute sa surface. Un petit reste peut aussi venir d’un décalage GPS ou d’une connexion cartographique imparfaite.</p><p>Comparez la portion à la trace de votre sortie. Si vous l’avez bien parcourue, vous pouvez la corriger ici ; le retour au calcul automatique reste possible.</p></details></div>
}
