import {useCallback,useEffect,useRef,useState} from 'react'
import type {Coordinate,Coverage} from '../types'
import type {Departure} from '../routing/departure'
import type {LoopProposal,LoopResult} from '../routing/loops'
import {createRouteClient} from '../routing/client'
import {exportLoop,type ExportMode} from '../routing/gpx'
import {ReliefProfile} from './ReliefProfile'
import {km} from '../stats/progress'
export interface RoutePreview {departure:Departure;loop?:LoopProposal}
interface Props {point:Coordinate|null;radius?:number;networkVersion:string;coverage:Coverage;excluded:Set<string>;district:number;picking:boolean;onPreview:(preview:RoutePreview|null)=>void;onArea?:(district:number)=>void}
export function RoutePanel({point,networkVersion,coverage,excluded,district,radius=500,picking,onPreview,onArea}:Props){
 const [distance,setDistance]=useState<5000|8000|10000|15000>(5000),[departure,setDeparture]=useState<Departure|null>(null),[result,setResult]=useState<LoopResult|null>(null),[selected,setSelected]=useState(-1),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [area,setArea]=useState(0),[avoidHills,setAvoidHills]=useState(true)
 const [client]=useState(createRouteClient),generation=useRef(0),exporting=useRef(false)
 const [saving,setSaving]=useState(false)
 const invalidate=useCallback(()=>{generation.current++;client.cancel()},[client])
 useEffect(()=>{
  invalidate()
  // External inputs invalidate all derived route UI together.
  // eslint-disable-next-line react/set-state-in-effect
  setDeparture(null);setResult(null);setSelected(-1);setBusy(false);setMessage('');onPreview(null)
  return invalidate
 },[point,networkVersion,coverage,excluded,district,picking,onPreview,invalidate,radius,area,avoidHills])
 const cancel=()=>{invalidate();setBusy(false);setMessage('Calcul annulé.');setResult(null);setSelected(-1);onPreview(departure?{departure}:null)}
 const changeArea=(value:number)=>{invalidate();setArea(value);setDeparture(null);setResult(null);setSelected(-1);setBusy(false);setMessage('');onPreview(null);onArea?.(value)}
 const changeDistance=(value:number)=>{cancel();setDistance(value as typeof distance);setMessage('')}
 const run=async(type:'locate'|'generate')=>{
  if(!point)return
  const ticket=++generation.current
  setBusy(true);setMessage(type==='locate'?'Chargement du réseau piéton…':'Calcul des parcours…');setResult(null);setSelected(-1);onPreview(departure?{departure}:null)
  try{
   const response=await client.request(type==='locate'?{type:'locate',point:point,networkVersion:networkVersion}:{type:'generate',start:departure!.node,targetMeters:distance,coverage:coverage,excluded:[...excluded],district:area,networkVersion:networkVersion,scope:area?{type:'district',district:area}:{type:'circle',center:point,radius},avoidHills},m=>{if(ticket===generation.current)setMessage(m)})
   if(ticket!==generation.current)return
   if(response.type==='departure'){
    setDeparture(response.departure);onPreview(response.departure?{departure:response.departure}:null)
    setMessage(response.departure?'Départ proposé affiché en violet. Vérifiez son emplacement avant de générer.':'Aucun départ relié trouvé à moins de 200 m. Rapprochez le point d’une rue ou d’un chemin public.')
   }else{
    setResult(response.result);setMessage(response.result.proposals.length?'Choisissez une proposition.':response.result.status==='outside-scope'?'Le départ est trop éloigné de la zone choisie. Placez un point dans cet arrondissement ou revenez au cercle.':response.result.status==='budget'?'La limite de calcul a été atteinte sans boucle satisfaisante. Essayez une autre distance ou un autre départ.':'Aucune boucle avec de nouvelles portions estimées ne respecte les critères. Essayez un autre départ ou agrandissez la zone.')
    if(response.result.proposals.length){setSelected(0);onPreview({departure:departure!,loop:response.result.proposals[0]})}
   }
  }catch(error){if(ticket===generation.current&&!(error instanceof Error&&error.name==='AbortError'))setMessage(error instanceof Error?error.message:'Le calcul a échoué. Réessayez.')}
  finally{if(ticket===generation.current)setBusy(false)}
 }
 const show=(loop:LoopProposal,index:number)=>{setSelected(index);onPreview({departure:departure!,loop});document.querySelector('.city-map')?.scrollIntoView({behavior:'smooth',block:'center'})}
 const save=async(loop:LoopProposal,mode:ExportMode='auto')=>{
  if(exporting.current)return
  const ticket=generation.current;exporting.current=true;setSaving(true)
  try{const outcome=await exportLoop(loop,mode);if(ticket===generation.current)setMessage(outcome==='cancelled'?'Partage annulé.':outcome==='shared'?'Parcours transmis au partage.':'Téléchargement du GPX lancé. Retrouvez-le dans les téléchargements de votre navigateur ou dans Fichiers.')}
  catch(error){if(ticket===generation.current)setMessage(error instanceof Error?error.message:'L’export a échoué. Réessayez.')}
  finally{exporting.current=false;setSaving(false)}
 }
 return <section className="route-panel" aria-label="Proposer un parcours">
  <h3>Préparer une boucle</h3>
  <p>Quadrillez les petites rues proches. Les courts repassages sont acceptés ; la zone et le relief passent avant la distance exacte.</p>
  <div className="setting-buttons"><label>Zone à explorer <select value={area} onChange={e=>changeArea(Number(e.target.value))}><option value={0}>Autour du point · cercle de {radius} m</option>{[1,2,3,4,5,6,7,8,9].map(id=><option key={id} value={id}>Lyon {id}{id===1?'er':'e'} arrondissement</option>)}</select></label><label><input type="checkbox" checked={avoidHills} onChange={e=>{cancel();setAvoidHills(e.target.checked)}}/> Limiter les côtes</label></div>
  <p className="muted">{area?'Choisissez un départ dans l’arrondissement ; de petits débordements restent possibles. Le cercle bleu sert uniquement au mode Autour du point.':'Le cercle est prioritaire. De petits débordements sont permis, sans partir chercher des rues à l’autre bout de Lyon.'}</p>
  {!point?<p>Choisissez d’abord un point sur la carte avec « Autour d’un point ».</p>:<>
   <div className="setting-buttons"><label>Distance souhaitée <select value={distance} onChange={e=>changeDistance(Number(e.target.value))}>{[5000,8000,10000,15000].map(d=><option key={d} value={d}>{d/1000} km</option>)}</select></label>
   {!departure?<button className="button primary" disabled={busy||picking} onClick={()=>void run('locate')}>Trouver un départ proche</button>:<button className="button primary" disabled={busy||picking} onClick={()=>void run('generate')}>Générer depuis ce départ</button>}
   {busy&&<button className="button" onClick={cancel}>Annuler</button>}</div>
   {!departure&&<p className="muted">Premier chargement avec une connexion ; les données seront réutilisées sur cet appareil. Aucune position GPS n’est demandée.</p>}
   {departure&&<p>Départ violet à environ <strong>{Math.round(departure.distance)} m à vol d’oiseau</strong> du point choisi. Le trajet pour le rejoindre n’est pas inclus. {area?`Exploration prioritaire de Lyon ${area}.`:`Exploration prioritaire du cercle de ${radius} m.`}</p>}
   <p role="status" aria-live="polite">{message}</p>
   {result?.status==='budget'&&result.proposals.length>0&&<p>Limite de calcul atteinte : voici les propositions trouvées dans le temps et le budget disponibles.</p>}
   {!!result?.proposals.length&&<ol className="route-options">{result.proposals.map((loop,i)=><li key={i} className={selected===i?'selected':''}><h4>Proposition {i+1} · {km(loop.meters)} km</h4><p><strong>≈ {km(loop.newMeters)} km nouveaux estimés</strong><br/>{km(loop.repeatedMeters)} km de repassages identifiés{loop.outsideMeters!==undefined&&<><br/>{Math.round(100*(1-loop.outsideMeters/loop.meters))} % du parcours dans la zone</>}</p>{loop.shorter&&<p>Parcours plus court : la zone a été privilégiée, sans ajouter des kilomètres de liaison.</p>}{loop.relief&&<ReliefProfile relief={loop.relief}/>}<div className="setting-buttons"><button className="button" aria-pressed={selected===i} onClick={()=>show(loop,i)}>Voir sur la carte</button><button className="button" disabled={saving} onClick={()=>void save(loop)}>Exporter le GPX</button><button className="button" disabled={saving} onClick={()=>void save(loop,'download')}>Télécharger le fichier</button></div></li>)}</ol>}
  </>}
  <p className="muted route-explanation">Parcours expérimentaux : distance indicative, jusqu’à +10 %, parfois plus courts pour rester proches. Le relief est estimé d’après le terrain IGN ; les passages inconnus ne sont pas considérés comme plats. Estimation prudente des nouveaux mètres, sur les portions associées au réseau piéton (environ 66 % du réseau de progression). Vérifiez les accès sur place. Aucun kilomètre n’est validé en générant une boucle.</p>
  <p className="muted">Sur iPhone, le bouton GPX ouvre le partage si disponible, sinon télécharge le fichier. « Télécharger le fichier » permet aussi de récupérer le GPX directement. Enregistrez-le dans Fichiers ou ouvrez-le dans une application compatible ; l’import direct dans Strava ou Plans n’est pas garanti.</p>
 </section>
}
