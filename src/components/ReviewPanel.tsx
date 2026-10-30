import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { activityCoverage, fraction } from '../stats/progress'
import { db } from '../db/database'
import { DIAGNOSTIC_VERSION, type IgnoredReview, type ReviewResult } from '../review/diagnostics'
import type { Activity, Correction, Coverage, Network, Segment } from '../types'
interface Props {activity:Activity;network:Network;corrections:Correction[];coverage?:Coverage;busy:boolean;onInspect:(segment:Segment)=>void;onDecide:(segment:Segment,action:'include'|'remove'|'ignore')=>void;onReset:()=>void;onClose:()=>void}
export function ReviewPanel({activity,network,corrections,coverage,busy,onInspect,onDecide,onReset,onClose}:Props){
  const [state,setState]=useState<{activity:Activity;network:Network;attempt:number;result?:ReviewResult;progress?:number;error?:boolean}>()
  const [reasonFilter,setReasonFilter]=useState('all'),[districtFilter,setDistrictFilter]=useState(0)
  const [attempt,setAttempt]=useState(0),[limit,setLimit]=useState(20)
  const ownCoverage=useMemo(()=>activityCoverage(activity),[activity])
  const ignored=useLiveQuery(()=>db.settings.get('reviewIgnored'),[])
  const records=(ignored?.value||[]) as IgnoredReview[]
  const ignoredIds=new Set(records.filter(r=>r.activityId===activity.id&&r.version===DIAGNOSTIC_VERSION).map(r=>r.segmentId))
  const corrected=new Set(corrections.map(c=>c.segmentId))
  const segments=useMemo(()=>new Map(network.segments.map(s=>[s.id,s])),[network])
  useEffect(()=>{
    let active=true,worker:Worker|undefined
    const base={activity,network,attempt}
    const fail=()=>{if(active)setState({...base,error:true});worker?.terminate()}
    const timeout=setTimeout(fail,120_000)
    try{
      worker=new Worker(new URL('../review/review.worker.ts',import.meta.url),{type:'module'})
      worker.onmessage=e=>{if(!active)return;if(e.data.error){clearTimeout(timeout);fail()}else if(e.data.result){setState({...base,result:e.data.result});clearTimeout(timeout);worker?.terminate()}else setState({...base,progress:e.data.progress})}
      worker.onerror=()=>{clearTimeout(timeout);fail()}
      worker.postMessage({segments:network.segments,tracks:activity.tracks,coverage:activityCoverage(activity)})
    }catch{clearTimeout(timeout);fail()}
    return()=>{active=false;clearTimeout(timeout);worker?.terminate()}
  },[activity,network,attempt])
  const current=state?.activity===activity&&state.network===network&&state.attempt===attempt?state:undefined
  const suggestions=current?.result?.suggestions.filter(s=>!ignoredIds.has(s.segmentId)&&!corrected.has(s.segmentId)&&!(s.reason!=='parallel'&&fraction((coverage||ownCoverage)[s.segmentId])>=1-1e-9))||[]
  const filtered=suggestions.filter(s=>(reasonFilter==='all'||s.reason===reasonFilter)&&(!districtFilter||segments.get(s.segmentId)?.district===districtFilter))
  return <section id="review-panel" className="panel review-panel" aria-label="Segments à vérifier"><div className="section-bar"><h2>À vérifier · {activity.name}</h2><button className="button" onClick={onClose}>Fermer</button></div><div className="history-body">
    <p className="history-explanation">Vérification facultative : ces indices peuvent provenir du GPS ou de la carte. Ils ne prouvent pas une erreur. Comparez la portion bleue à votre trace orange avant de décider.</p>
    <p className="history-explanation">Valider ou refuser corrige la portion entière pour votre progression, toutes sorties confondues. Ignorer masque seulement la suggestion de cette sortie, sans changer vos kilomètres.</p>
    {!current?.result&&!current?.error&&<p role="status">Analyse des indices GPS… {current?.progress||0} %</p>}
    {current?.error&&<div role="alert"><p>L’analyse n’a pas pu aboutir. Vos sorties et votre progression sont conservées.</p><button className="button" onClick={()=>setAttempt(n=>n+1)}>Réessayer</button></div>}
    {current?.result&&<><p>{suggestions.length} portion(s) à vérifier. {current.result.truncated?'Liste limitée aux 500 premières suggestions de cette sortie.':''}</p>{!suggestions.length&&<p>Aucune suggestion en attente pour les cas détectés. Cela ne garantit pas que toute la trace est exacte.</p>}
      <div className="setting-buttons review-filters"><label>Type d’indice <select value={reasonFilter} onChange={e=>{setReasonFilter(e.target.value);setLimit(20)}}><option value="all">Tous les indices</option><option value="unmatched">Portions proches non retenues</option><option value="offset">Décalages GPS</option><option value="parallel">Voies parallèles</option></select></label><label>Arrondissement <select value={districtFilter} onChange={e=>{setDistrictFilter(Number(e.target.value));setLimit(20)}}><option value={0}>Tout Lyon</option>{[1,2,3,4,5,6,7,8,9].map(id=><option key={id} value={id}>Lyon {id}{id===1?'er':'e'}</option>)}</select></label></div>
      {!!suggestions.length&&<p>{filtered.length} portion(s) correspondent aux filtres.</p>}
      {filtered.slice(0,limit).map(s=>{const segment=segments.get(s.segmentId);if(!segment)return null;return <article className="review-row" key={s.segmentId}><h3>{segment.name||'Voie sans nom'} · {segment.lengthMeters.toFixed(1)} m</h3><p>{s.reason==='parallel'?'Deux voies parallèles proches sont plausibles.':s.reason==='unmatched'?'La trace longe cette petite portion, mais le calcul n’en a pas retenu la totalité. Vérifiez le passage exact.':'Le décalage GPS de cette portion reste à examiner.'} Écart observé : environ {Math.round(s.distance)} m.</p><div className="setting-buttons"><button className="button" onClick={()=>onInspect(segment)}>Comparer sur la carte</button><button className="button" disabled={busy} onClick={()=>onDecide(segment,'include')}>Je l’ai parcourue</button><button className="button" disabled={busy} onClick={()=>onDecide(segment,'remove')}>Je ne l’ai pas parcourue</button><button className="button subtle" disabled={busy} onClick={()=>onDecide(segment,'ignore')}>Ignorer</button></div></article>})}
      {filtered.length>limit&&<button className="button" onClick={()=>setLimit(n=>n+20)}>Afficher 20 portions de plus</button>}
    </>}
    {ignoredIds.size>0&&<button className="button" disabled={busy} onClick={onReset}>Réafficher les {ignoredIds.size} portion(s) ignorée(s)</button>}
    <small className="history-explanation">Pour annuler une correction, touchez la portion sur la carte puis « Revenir au calcul automatique ». Le diagnostic ne remplace pas votre connaissance du terrain.</small>
  </div></section>
}

