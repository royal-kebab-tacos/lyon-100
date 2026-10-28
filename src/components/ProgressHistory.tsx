import { useEffect, useMemo, useState } from 'react'
import type { Activity, Correction, Network } from '../types'
import { dayInParis, historyPeriods, recentGains, type HistoryResult, type HistoryRow, type Period } from '../stats/history'
import { km, percentText } from '../stats/progress'

function dateLabel(day: string, month = false) {
  return new Date(day+'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone:'UTC', ...(month ? {} : {day:'numeric' as const}), month:'long',year:'numeric' })
}
function HistoryChart({ rows, district, total }: { rows: HistoryRow[]; district: number; total: number }) {
  if (!rows.length || !total) return null
  const start = Date.parse(rows[0].date), end = Date.parse(rows.at(-1)!.date)
  const x = (date:string) => end === start ? 320 : 45 + 550 * (Date.parse(date)-start)/(end-start)
  const y = (meters:number) => 180 - 150 * Math.min(1,meters/total)
  // Step line: no imaginary gradual gains between recorded periods.
  const path = rows.map((row,i) => `${i ? 'H' : 'M'} ${x(row.date)} ${i ? 'V' : ''} ${y(row.cumulative[district])}`).join(' ')
  return <figure className="history-chart"><svg viewBox="0 0 640 225" role="img" aria-label="Évolution cumulée des kilomètres uniques, en pourcentage. Valeurs détaillées dans le tableau ci-dessous.">
    {[0,25,50,75,100].map(p=><g key={p}><line x1="45" x2="595" y1={180-1.5*p} y2={180-1.5*p} className="history-gridline"/><text x="37" y={184-1.5*p} textAnchor="end">{p} %</text></g>)}
    <path d={path} fill="none" className="history-line"/>
    {rows.map(row=><circle key={row.date} cx={x(row.date)} cy={y(row.cumulative[district])} r="3" className="history-point"><title>{dateLabel(row.date)} : {km(row.cumulative[district])} km</title></circle>)}
    <text x="45" y="209">{dateLabel(rows[0].date)}</text><text x="595" y="209" textAnchor="end">{rows.length>1 ? dateLabel(rows.at(-1)!.date) : ''}</text>
  </svg><figcaption>Progression automatique cumulée en fin de période, à ce jour pour la période en cours.</figcaption></figure>
}
export function ProgressHistory({network,activities,corrections,district}: {network:Network;activities:Activity[];corrections:Correction[];district:number}) {
  const [period,setPeriod] = useState<Period>('month')
  const [limit,setLimit] = useState(12)
  const [retry,setRetry] = useState(0)
  const [clock,setClock] = useState(()=>Date.now())
  const [state,setState] = useState<{network:Network;activities:Activity[];corrections:Correction[];retry:number;result?:HistoryResult;error?:boolean}>()
  // Refresh recent period labels when reopening the app after midnight.
  useEffect(()=>{const update=()=>setClock(Date.now());window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);const timer=setInterval(update,60_000);return()=>{window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);clearInterval(timer)}},[])
  useEffect(()=>{
    let active=true, worker:Worker|undefined
    const base={network,activities,corrections,retry}
    const failed=()=>{if(active)setState({...base,error:true});worker?.terminate()}
    const timeout=setTimeout(failed,60_000)
    try {
      worker=new Worker(new URL('../stats/history.worker.ts',import.meta.url),{type:'module'})
      worker.onmessage=e=>{if(active)setState({...base,...(e.data.error?{error:true}:{result:e.data.result})});clearTimeout(timeout);worker?.terminate()}
      worker.onerror=failed
      worker.postMessage({segments:network.segments.map(({id,lengthMeters,district})=>({id,lengthMeters,district})),activities:activities.map(({id,date,importedAt,coverage,segmentIds})=>({id,date,importedAt,coverage,segmentIds})),excluded:corrections.filter(c=>c.action==='exclude').map(c=>c.segmentId)})
    } catch {failed()}
    return()=>{active=false;clearTimeout(timeout);worker?.terminate()}
  },[network,activities,corrections,retry])
  const current=state?.network===network&&state.activities===activities&&state.corrections===corrections&&state.retry===retry?state:undefined
  const result=current?.result
  const today=dayInParis(new Date(clock).toISOString())!
  const rows=useMemo(()=>result?historyPeriods(result,period,today):[],[result,period,today])
  const visible=rows.slice(-limit)
  const total=result?.totals[district] || 0
  return <section className="panel history-panel" aria-label="Historique de progression">
    <div className="section-bar"><h2>Votre progression dans le temps · {district?`Lyon ${district}`:'Tout Lyon'}</h2></div>
    <div className="history-body">
      <p className="history-explanation">Kilomètres uniques apportés par vos sorties, à leur date de réalisation. Les passages répétés ne comptent qu’une fois.</p>
      <p className="history-explanation">Les validations et retraits manuels ne sont pas datés dans cet historique. Les voies actuellement exclues sont retirées de toutes les périodes. Les chiffres peuvent donc différer de votre progression actuelle corrigée.</p>
      {!result&&!current?.error&&<p role="status">Calcul de votre historique…</p>}
      {current?.error&&<div role="alert"><p>Impossible de calculer l’historique pour le moment. Vos sorties sont conservées.</p><button className="button" onClick={()=>setRetry(n=>n+1)}>Réessayer</button></div>}
      {result&&!result.days.length&&<p>Importez une sortie pour commencer votre historique.</p>}
      {!!result?.undated&&<p className="history-explanation">{result.undated} sortie(s) sans date : leur date d’import est utilisée.</p>}
      {!!result?.skipped&&<p role="alert">{result.skipped} sortie(s) sans date utilisable ne figurent pas dans cet historique.</p>}
      {result&&result.days.length>0&&<>
        <div className="history-recent"><div><span>Cette semaine</span><strong>+{km(recentGains(result,today,'week',district))} km</strong></div><div><span>Ce mois-ci</span><strong>+{km(recentGains(result,today,'month',district))} km</strong></div><p>De nouvelles voies, selon les sorties importées. Semaines du lundi au dimanche, heure de Lyon.</p></div>
        <div className="filters" aria-label="Période de l’historique">{(['week','month'] as Period[]).map(p=><button key={p} aria-pressed={period===p} className={period===p?'selected':''} onClick={()=>{setPeriod(p);setLimit(12)}}>{p==='week'?'Par semaine':'Par mois'}</button>)}</div>
        <HistoryChart rows={visible} district={district} total={total}/>
        {!total&&<p>Aucune voie éligible dans cette zone.</p>}
        <div className="history-table-wrap"><table className="history-table"><caption>Gains et cumul — {visible.length} période(s) affichée(s), les plus récentes en premier</caption><thead><tr><th scope="col">{period==='week'?'Semaine du':'Mois'}</th><th scope="col">Nouvelles voies</th><th scope="col">Cumul unique</th><th scope="col">Progression</th></tr></thead><tbody>{[...visible].reverse().map(row=><tr key={row.date}><th scope="row">{dateLabel(row.date,period==='month')}</th><td>+{km(row.gained[district])} km</td><td>{km(row.cumulative[district])} km</td><td>{percentText(total?100*row.cumulative[district]/total:0,total>0&&total-row.cumulative[district]<=1e-8)} %</td></tr>)}</tbody></table></div>
        {rows.length>limit&&<button className="button" onClick={()=>setLimit(n=>n+12)}>Afficher 12 périodes plus anciennes</button>}
        <small className="history-explanation">Historique reconstruit sur le réseau actuel : supprimer une sortie ou modifier les exclusions actualise aussi les périodes passées. Les périodes sans sortie affichent un gain nul.</small>
      </>}
    </div>
  </section>
}
