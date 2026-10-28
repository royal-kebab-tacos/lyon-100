import { useMemo } from 'react'
import type { Coordinate, Coverage, Network, Segment } from '../types'
import { km } from '../stats/progress'
import { createNearbySearch } from './nearby'

export interface NearbyProps { network:Network; coverage:Coverage; excluded:Set<string>; district:number; center:Coordinate|null; radius:number; picking:boolean; onPick:()=>void; onClear:()=>void; onRadius:(radius:number)=>void; onLocate:(segment:Segment)=>void }
export function NearbyPanel(p:NearbyProps) {
  const search = useMemo(()=>createNearbySearch(p.network.segments),[p.network])
  const result = useMemo(()=>p.center?search(p.center,p.radius,p.coverage,p.excluded,p.district):null,[search,p.center,p.radius,p.coverage,p.excluded,p.district])
  return <section className="nearby-panel" aria-label="Explorer autour d’un point">
    <h3>Autour d’un point</h3>
    <p>Repérez les portions à découvrir près du lieu de votre choix.</p>
    <div className="setting-buttons"><button className="button" aria-pressed={p.picking} onClick={p.onPick}>{p.picking?'Annuler le choix':p.center?'Déplacer le point':'Choisir sur la carte'}</button>
    <label>Rayon <select value={p.radius} onChange={e=>p.onRadius(Number(e.target.value))}>{[250,500,1000,2000].map(r=><option value={r} key={r}>{r<1000?`${r} m`:`${r/1000} km`}</option>)}</select></label>
    {p.center&&<button className="button" onClick={p.onClear}>Effacer le point</button>}</div>
    {p.picking&&<p role="status">Touchez la carte pour placer le point. Vous pouvez d’abord la déplacer ou zoomer.</p>}
    {result&&<><p role="status"><strong>{km(result.meters)} km à découvrir</strong> dans le cercle · {result.streetCount} noms de rues avec des portions restantes{p.district?` · Lyon ${p.district}`:' · Tout Lyon'}.</p>
    <p className="muted">Distances de proximité à vol d’oiseau, pas des trajets à pied. Les mètres sont limités au cercle, y compris les petits restes des rues au statut « Terminée ». Les voies sans nom représentent {km(result.unnamedMeters)} km.</p>
    {result.rows.length>0&&<><p>Les {Math.min(10,result.rows.length)} rues les plus proches avec des portions restantes :</p><ol className="nearby-list">{result.rows.slice(0,10).map(row=><li key={row.name}><div><strong>{row.name}</strong><small>À environ {Math.round(row.distance)} m · {km(row.meters)} km restants dans le cercle</small></div><button className="button" onClick={()=>p.onLocate(row.segment)}>Voir</button></li>)}</ol></>}
    {result.meters<1e-6&&<p>Aucune portion restante dans ce cercle pour la zone sélectionnée. Essayez un autre point ou un rayon plus grand.</p>}
    </>}
  </section>
}
