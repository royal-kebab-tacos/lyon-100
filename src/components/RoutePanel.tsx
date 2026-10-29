import {useCallback,useEffect,useRef,useState} from 'react'
import type {Coordinate,Coverage} from '../types'
import type {Departure} from '../routing/departure'
import type {LoopProposal,LoopResult} from '../routing/loops'
import {createRouteClient} from '../routing/client'
import {exportLoop} from '../routing/gpx'
import {km} from '../stats/progress'
export interface RoutePreview {departure:Departure;loop?:LoopProposal}
interface Props {point:Coordinate|null;networkVersion:string;coverage:Coverage;excluded:Set<string>;district:number;picking:boolean;onPreview:(preview:RoutePreview|null)=>void}
export function RoutePanel({point,networkVersion,coverage,excluded,district,picking,onPreview}:Props){
 const [distance,setDistance]=useState<5000|8000|10000|15000>(5000),[departure,setDeparture]=useState<Departure|null>(null),[result,setResult]=useState<LoopResult|null>(null),[selected,setSelected]=useState(-1),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [client]=useState(createRouteClient),generation=useRef(0)
 const invalidate=useCallback(()=>{generation.current++;client.cancel()},[client])
 useEffect(()=>{
  invalidate()
  // External inputs invalidate all derived route UI together.
  // eslint-disable-next-line react/set-state-in-effect
  setDeparture(null);setResult(null);setSelected(-1);setBusy(false);setMessage('');onPreview(null)
  return invalidate
 },[point,networkVersion,coverage,excluded,district,picking,onPreview,invalidate])
 const cancel=()=>{invalidate();setBusy(false);setMessage('Calcul annulé.');setResult(null);setSelected(-1);onPreview(departure?{departure}:null)}
 const changeDistance=(value:number)=>{cancel();setDistance(value as typeof distance);setMessage('')}
 const run=async(type:'locate'|'generate')=>{
  if(!point)return
  const ticket=++generation.current
  setBusy(true);setMessage(type==='locate'?'Chargement du réseau piéton…':'Calcul des parcours…');setResult(null);setSelected(-1);onPreview(departure?{departure}:null)
  try{
   const response=await client.request(type==='locate'?{type:'locate',point:point,networkVersion:networkVersion}:{type:'generate',start:departure!.node,targetMeters:distance,coverage:coverage,excluded:[...excluded],district:district,networkVersion:networkVersion},m=>{if(ticket===generation.current)setMessage(m)})
   if(ticket!==generation.current)return
   if(response.type==='departure'){
    setDeparture(response.departure);onPreview(response.departure?{departure:response.departure}:null)
    setMessage(response.departure?'Départ proposé affiché en violet. Vérifiez son emplacement avant de générer.':'Aucun départ relié trouvé à moins de 200 m. Rapprochez le point d’une rue ou d’un chemin public.')
   }else{
    setResult(response.result);setMessage(response.result.proposals.length?'Choisissez une proposition.':response.result.status==='budget'?'La limite de calcul a été atteinte sans boucle satisfaisante. Essayez une autre distance ou un autre départ.':'Aucune boucle avec de nouvelles portions estimées ne respecte les critères. Essayez un autre départ, une autre distance ou Tout Lyon.')
    if(response.result.proposals.length){setSelected(0);onPreview({departure:departure!,loop:response.result.proposals[0]})}
   }
  }catch(error){if(ticket===generation.current&&!(error instanceof Error&&error.name==='AbortError'))setMessage(error instanceof Error?error.message:'Le calcul a échoué. Réessayez.')}
  finally{if(ticket===generation.current)setBusy(false)}
 }
 const show=(loop:LoopProposal,index:number)=>{setSelected(index);onPreview({departure:departure!,loop});document.querySelector('.city-map')?.scrollIntoView({behavior:'smooth',block:'center'})}
 const save=async(loop:LoopProposal)=>{try{await exportLoop(loop)}catch(error){setMessage(error instanceof Error?error.message:'L’export a échoué. Réessayez.')}}
 return <section className="route-panel" aria-label="Proposer un parcours">
  <h3>Préparer une boucle</h3>
  <p>Privilégiez les portions encore à découvrir, puis emportez le tracé en GPX.</p>
  {!point?<p>Choisissez d’abord un point sur la carte avec « Autour d’un point ».</p>:<>
   <div className="setting-buttons"><label>Distance souhaitée <select value={distance} onChange={e=>changeDistance(Number(e.target.value))}>{[5000,8000,10000,15000].map(d=><option key={d} value={d}>{d/1000} km</option>)}</select></label>
   {!departure?<button className="button primary" disabled={busy||picking} onClick={()=>void run('locate')}>Trouver un départ proche</button>:<button className="button primary" disabled={busy||picking} onClick={()=>void run('generate')}>Générer depuis ce départ</button>}
   {busy&&<button className="button" onClick={cancel}>Annuler</button>}</div>
   {!departure&&<p className="muted">Premier chargement avec une connexion ; les données seront réutilisées sur cet appareil. Aucune position GPS n’est demandée.</p>}
   {departure&&<p>Départ violet à environ <strong>{Math.round(departure.distance)} m à vol d’oiseau</strong> du point choisi. Le trajet pour le rejoindre n’est pas inclus. {district?`Les nouveaux mètres sont recherchés dans Lyon ${district} ; la boucle peut en sortir.`:'Nouveaux mètres recherchés dans tout Lyon.'}</p>}
   <p role="status" aria-live="polite">{message}</p>
   {result?.status==='budget'&&result.proposals.length>0&&<p>Limite de calcul atteinte : voici les propositions trouvées dans le temps et le budget disponibles.</p>}
   {!!result?.proposals.length&&<ol className="route-options">{result.proposals.map((loop,i)=><li key={i} className={selected===i?'selected':''}><h4>Proposition {i+1} · {km(loop.meters)} km</h4><p><strong>≈ {km(loop.newMeters)} km nouveaux estimés</strong><br/>{km(loop.repeatedMeters)} km de repassages identifiés</p><div className="setting-buttons"><button className="button" aria-pressed={selected===i} onClick={()=>show(loop,i)}>Voir sur la carte</button><button className="button" onClick={()=>void save(loop)}>Exporter le GPX</button></div></li>)}</ol>}
  </>}
  <p className="muted route-explanation">Parcours expérimentaux : distances possibles de ±20 %. Estimation prudente des nouveaux mètres, sur les portions associées au réseau piéton (environ 66 % du réseau de progression). Vérifiez les accès sur place. Aucun kilomètre n’est validé en générant une boucle.</p>
  <p className="muted">Sur iPhone, le bouton GPX ouvre le partage si disponible, sinon télécharge le fichier. Enregistrez-le dans Fichiers ou ouvrez-le dans une application compatible ; l’import direct dans Strava ou Plans n’est pas garanti.</p>
 </section>
}
