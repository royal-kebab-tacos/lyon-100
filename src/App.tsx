import { ReviewPanel } from './components/ReviewPanel'
import { ignoreReview, clearIgnoredReviews } from './review/storage'
import { ProgressHistory } from './components/ProgressHistory'
import { ProgressOverview } from './components/ProgressOverview'
import { zoneSummaries } from './stats/zones'
import { useTheme, type Theme } from './settings/theme'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CityMap, type MapFilter } from './map/CityMap'
import { Icon } from './components/Icon'
import { UpdateNotice } from './components/UpdateNotice'
import { loadNetwork } from './osm/load'
import { db, deleteActivity, ensureNetwork, isDuplicate, resetData, saveActivity, setCorrection, storageError } from './db/database'
import { exportBackup, restoreBackup, validateBackup } from './db/backup'
import { sha256, contentHash } from './gpx/parse'
import { createMatcher } from './gpx/workerClient'
import { km, percentText, progress, streetProgress } from './stats/progress'
import { GPS_TOLERANCE_METERS, CONTINUITY_MAX_METERS, WIDE_STREET_TOLERANCE_METERS, WIDE_STREET_MIN_FOLLOW_METERS, STREET_COMPLETION_THRESHOLD, SEGMENT_MAX_METERS, SAMPLE_INTERVAL_METERS, MAX_HEADING_DIFFERENCE_DEGREES, MAX_BACKUP_BYTES } from './utils/config'
import type { Activity, Network, TrackPoint, Segment } from './types'
import { readActivityFile } from './gpx/import'
import './App.css'
type Page = 'Carte' | 'Progression' | 'Activités' | 'À vérifier' | 'Réglages'
type Confirmation = { title: string; description: string; label: string; action: () => Promise<void> }
const nav: { page: Page; icon: string }[] = [{ page: 'Carte', icon: 'map' }, { page: 'Progression', icon: 'progress' }, { page: 'Activités', icon: 'activity' }, { page: 'À vérifier', icon: 'search' }, { page: 'Réglages', icon: 'settings' }]
const dateText = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date inconnue'
function readable(error: unknown): string {
  if (error instanceof Error && /^(Ce |Cette |Le réseau|Le calcul|L’analyse|La sauvegarde|Vos |Impossible|Le fichier)/.test(error.message)) return error.message
  return storageError()
}
function App() {
  const { theme, setTheme } = useTheme()
  const [reviewActivityId,setReviewActivityId]=useState('')
  const [reviewFocus,setReviewFocus]=useState('')
  const [page, setPage] = useState<Page>('Carte')
  const [network, setNetwork] = useState<Network>()
  const [fatal, setFatal] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [tracks, setTracks] = useState<TrackPoint[][]>([])
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')
  const [district,setDistrict]=useState(0)
  const [mapFilter,setMapFilter]=useState<MapFilter>('Toutes')
  const [focusStreet,setFocusStreet]=useState('')
  const [selected,setSelected]=useState<Segment>()
  const [dragging, setDragging] = useState(false)
  const picker = useRef<HTMLInputElement>(null), backupPicker = useRef<HTMLInputElement>(null)
  const matcher = useRef<ReturnType<typeof createMatcher> | null>(null)
  const mutation = useRef(false)
  const corrections=useLiveQuery(()=>db.corrections.toArray(),[])
  const activities = useLiveQuery(() => db.activities.toArray().catch(() => []), [])
  useEffect(() => {
    let active = true
    loadNetwork().then(async n => {
      if(!active)return
      const engine=createMatcher(n);matcher.current=engine
      setStatus('Recalcul de vos sorties avec la nouvelle carte…');setBusy(true)
      const migrated=await ensureNetwork(n,db,t=>engine.match(t,done=>{if(active)setStatus(`Recalcul de vos sorties · ${done} %`)}))
      if(!active){engine.close();return}
      setNetwork(n);setBusy(false);setStatus('')
      if(migrated)setMessages([`${migrated} sortie(s) recalculée(s) automatiquement. Vos traces et vos dates ont été conservées.`])
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false)
    }).catch(e => { if (active) {setFatal(readable(e));setBusy(false)} })
    const online = () => setOffline(!navigator.onLine)
    window.addEventListener('online', online); window.addEventListener('offline', online)
    return () => { active = false; matcher.current?.close(); window.removeEventListener('online', online); window.removeEventListener('offline', online) }
  }, [])
  const stats = useMemo(() => network ? progress(network, activities || [],corrections||[],district) : null, [network, activities,corrections,district])
  const streets = useMemo(() => network && stats ? streetProgress(network, stats.coverage,stats.excluded,district) : [], [network, stats,district])
  const zones = useMemo(() => page === 'Progression' && network ? zoneSummaries(network, activities || [], corrections || []) : [], [page, network, activities, corrections])
  const filtered = streets.filter(s => s.name.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(search.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) && (filter === 'Toutes' || (filter === 'Terminées' && s.status === 'Terminée') || (filter === 'En cours' && s.status === 'Partiellement parcourue') || (filter === 'Non commencées' && s.status === 'Non commencée')))
  async function importFiles(files: File[]) {
    if (!network || !matcher.current || mutation.current || !files.length) return
    mutation.current = true; setBusy(true); setMessages([])
    const results: string[] = []
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setStatus(`Lecture ${i + 1}/${files.length} · ${file.name}`)
        try {
          const {text,parsed}=await readActivityFile(file)
          const raw = await sha256(text), canonical = await contentHash(parsed)
          if (await isDuplicate(raw, canonical)) { results.push(`${file.name} : cette sortie a déjà été importée.`); continue }
          const matched = await matcher.current.match(parsed.tracks, done => setStatus(`Analyse ${i + 1}/${files.length} · ${done} %`))
          setStatus(`Enregistrement ${i + 1}/${files.length}…`)
          const activity = await saveActivity(parsed, file.name, raw, canonical, matched, network)
          if (!activity) { results.push(`${file.name} : cette sortie a déjà été importée.`); continue }
          setTracks([])
          results.push(`${activity.name} : ${km(activity.distanceMeters)} km d’activité — ${km(activity.newMeters)} km de nouvelles rues — ${activity.newSegments} nouveaux segments.${activity.gaps ? ` ${activity.gaps} coupure(s) de trace ignorée(s).` : ''}`)
        } catch (e) { if (import.meta.env.DEV) console.error('Échec de l’import GPX', e); results.push(`${file.name} : ${readable(e)}`) }
        setMessages([...results])
      }
    } finally { mutation.current = false; setBusy(false); setStatus(''); setMessages(results) }
  }
  async function mutate(action: () => Promise<void>) {
    if (mutation.current) return
    mutation.current = true; setBusy(true)
    try { await action() } catch (e) { setMessages([readable(e)]) }
    finally { mutation.current = false; setBusy(false); setStatus('') }
  }
  async function backup() {
    if (!network) return
    await mutate(async () => {
      const text = await exportBackup(network)
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `lyon-100-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setMessages(['La sauvegarde a été préparée. Conservez le fichier JSON dans Fichiers ou Téléchargements.'])
    })
  }
  async function readBackup(file: File) {
    if (!network || !matcher.current) return
    await mutate(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Cette sauvegarde dépasse la limite de 100 Mo.')
      setStatus('Vérification de la sauvegarde…')
      const restored = await validateBackup(await file.text(), network, async t => matcher.current!.match(t, done => setStatus(`Vérification des traces · ${done} %`)))
      setConfirmation({ title: 'Restaurer cette sauvegarde ?', description: `${restored.activities.length} sortie(s) remplaceront les ${activities?.length || 0} sortie(s) présentes sur cet appareil.`, label: 'Remplacer mes données', action: async () => { await restoreBackup(restored, network); setTracks([]); setMessages(['La sauvegarde a été restaurée.']) } })
    })
  }
  function confirmDelete(a: Activity) {
    setConfirmation({ title: 'Supprimer cette sortie ?', description: `« ${a.name} » sera supprimée. Les rues parcourues dans d’autres sorties seront conservées.`, label: 'Supprimer la sortie', action: async () => { await deleteActivity(a.id); setTracks([]); setMessages(['La sortie a été supprimée. La progression a été recalculée.']) } })
  }
  const complete = !!stats && stats.remainingMeters < 0.001
  const namedSegments=useMemo(()=>{const grouped=new Map<string,Segment[]>();for(const s of network?.segments||[]){const name=s.name.normalize('NFC').trim(),rows=grouped.get(name)||[];rows.push(s);grouped.set(name,rows)}return grouped},[network])
  const selectedName=selected?.name.normalize('NFC').trim()
  const selectedStreet=useMemo(()=>selectedName&&network&&stats?streetProgress({...network,segments:namedSegments.get(selectedName)||[]},stats.coverage,stats.excluded)[0]:undefined,[selectedName,namedSegments,network,stats])
  return <div className="app-shell" onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }} onDrop={e => { e.preventDefault(); setDragging(false); void importFiles(Array.from(e.dataTransfer.files)) }}>
    <header className="topbar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('Carte') }} aria-label="Lyon 100, carte"><span className="brand-mark">L<span>100</span></span><span>LYON <b>100</b><small>UNE VILLE. CHAQUE RUE.</small></span></a><div className="desktop-note"><span className="status-dot"/> Votre exploration, à votre rythme</div><button className="button primary top-import" onClick={() => picker.current?.click()} disabled={busy || !network}><Icon name="upload"/>Importer une sortie</button></header>
    <input className="sr-only" ref={picker} type="file" accept=".gpx,.tcx,.gpx.gz,.tcx.gz,.gz,application/gpx+xml" multiple aria-label="Choisir des sorties GPX" onChange={e => { void importFiles(Array.from(e.target.files || [])); e.target.value = '' }} />
    <input className="sr-only" ref={backupPicker} type="file" accept=".json,application/json" aria-label="Choisir une sauvegarde JSON" onChange={e => { const f = e.target.files?.[0]; if (f) void readBackup(f); e.target.value = '' }} />
    <nav className="navigation" aria-label="Navigation principale">{nav.map(n => <button key={n.page} className={page === n.page ? 'nav-item active' : 'nav-item'} aria-current={page === n.page ? 'page' : undefined} onClick={() => setPage(n.page)}><Icon name={n.icon}/>{n.page}</button>)}<span className="local-note">DONNÉES SUR CET APPAREIL</span></nav>
    <main>
      <div className="page-heading"><div><p className="eyebrow">LYON, RUE APRÈS RUE</p><h1>{page === 'Carte' ? 'La ville est votre terrain de jeu.' : page === 'Progression' ? 'Chaque rue compte.' : page === 'Activités' ? 'Vos pas laissent une trace.' : page === 'À vérifier' ? 'Segments à vérifier' : 'Gardez le cap.'}</h1><p className="subtitle">{page === 'Carte' ? 'Courez, marchez, découvrez. Faites grandir votre carte de Lyon.' : page === 'Progression' ? 'Retrouvez le chemin parcouru et les rues qu’il reste à explorer.' : page === 'Activités' ? 'Toutes vos sorties, réunies sur votre carte.' : page === 'À vérifier' ? 'Examinez les portions GPS incertaines, uniquement quand vous le souhaitez.' : 'Vos données vous appartiennent. Prenez-en soin.'}</p></div><div className="city-tag"><span>45°45′ N · 4°50′ E</span>LYON, FRANCE</div></div>
      {fatal && <div role="alert" className="error-panel"><h2>Le chargement est interrompu</h2><p>{fatal}</p><button className="button" onClick={() => location.reload()}>Réessayer</button></div>}
      {!fatal && (!network || activities === undefined) && <div className="loading-panel" role="status"><span className="spinner"/>Préparation de votre carte de Lyon…</div>}
      {busy && <div className="processing" role="status" aria-live="polite"><span className="spinner"/>{status || 'Enregistrement en cours…'}<small>Gardez Lyon 100 ouvert jusqu’à la fin.</small></div>}
      {messages.length > 0 && <section className="messages" aria-label="Résultat de l’opération" aria-live="polite"><button className="dismiss" aria-label="Masquer les messages" onClick={() => setMessages([])}>×</button>{messages.map((m, i) => <p key={i}>{m}</p>)}</section>}
      {network && stats && activities && <>
        {(page==='Carte'||page==='Progression')&&<div className="zone-tools"><label>Zone <select value={district} onChange={e=>{setDistrict(Number(e.target.value));setReviewFocus('');setFocusStreet('');setSelected(undefined)}}><option value={0}>Tout Lyon</option>{Array.from({length:9},(_,i)=><option key={i+1} value={i+1}>Lyon {i+1}</option>)}</select></label><span>{streets.filter(s=>s.status==='Terminée').length} / {streets.length} rues terminées · seuil 95 %</span></div>}

        {(page === 'Carte' || page === 'Progression') && <section className="stats-grid" aria-label="Votre progression"><div className="stat stat-main"><span className="stat-label">{district?`LYON ${district} EXPLORÉ`:'LYON EXPLORÉE'}</span><strong>{percentText(stats.percent, complete)}<em> %</em></strong><div className="progress-track"><span style={{ width: `${stats.percent}%` }}/></div></div><div className="stat"><span className="stat-label">RUES UNIQUES PARCOURUES</span><strong>{km(stats.meters)}<em> km</em></strong><span className="stat-foot"><span className="status-dot"/> Chaque portion ne compte qu’une fois</span></div><div className="stat"><span className="stat-label">ENCORE À DÉCOUVRIR</span><strong>{km(stats.remainingMeters)}<em> km</em></strong><span className="stat-foot">Sur {km(stats.totalMeters)} km de voies éligibles</span></div><div className="stat compact"><span className="stat-label">SORTIES IMPORTÉES</span><strong>{stats.activities.toLocaleString('fr-FR')}</strong><span className="stat-foot">Une nouvelle sortie, de nouvelles rues</span></div></section>}
        {page === 'Carte' && <><section className="map-card"><div className="section-bar"><h2>Votre carte d’exploration</h2><div className="legend"><span><i className="legend-dot done"/>Parcourues</span><span><i className="legend-dot"/>À découvrir</span>{tracks.length > 0 && <span><i className="legend-dot trace"/>Trace GPX</span>}</div></div><div className="map-tools"><div className="filters">{(['Toutes','Restantes','Parcourues'] as MapFilter[]).map(f=><button key={f} className={mapFilter===f?'selected':''} onClick={()=>setMapFilter(f)}>{f==='Toutes'?'Toutes les portions':f}</button>)}</div>{tracks.length>0&&<button className="button" onClick={()=>setTracks([])}>Masquer la trace GPS</button>}<small>Touchez une portion pour consulter la rue ou corriger son état.</small></div><div className="map-wrap"><CityMap network={network} coverage={stats.coverage} excluded={stats.excluded} tracks={tracks} district={district} filter={mapFilter} focusStreet={focusStreet} focusSegmentId={reviewFocus} selectedId={selected?.id} onSelect={setSelected}/>{stats.activities === 0 && <div className="map-invite"><span className="invite-icon"><Icon name="activity" size={26}/></span><div><strong>Tout commence par une sortie.</strong><p>Importez votre premier GPX et révélez vos rues.</p></div><button className="button primary" onClick={() => picker.current?.click()} disabled={busy}><Icon name="upload"/><span>Importer un GPX</span></button></div>}{offline && <div className="map-offline">Hors ligne : le fond de carte peut être indisponible. Vos rues restent visibles.</div>}</div>{selected&&<section className="street-detail"><button className="dismiss" onClick={()=>setSelected(undefined)} aria-label="Fermer la fiche">×</button><h3>{selected.name||'Voie sans nom'}</h3>{selectedStreet&&<p>{km(selectedStreet.done)} / {km(selectedStreet.total)} km · {percentText(100*selectedStreet.done/selectedStreet.total,selectedStreet.done>=selectedStreet.total)} % · {selectedStreet.status}<br/>{km(selectedStreet.total-selectedStreet.done)} km restants</p>}<p>Portion sélectionnée : {selected.lengthMeters.toFixed(1)} m. La correction concerne uniquement ce petit trait bleu.</p><div className="setting-buttons">{([{action:'include',label:'Je l’ai parcourue'},{action:'remove',label:'Je ne l’ai pas parcourue'},{action:'exclude',label:'Exclure de mon objectif'},{action:'auto',label:'Revenir au calcul automatique'}] as const).map(c=><button className="button" key={c.action} disabled={busy} onClick={()=>setConfirmation({title:c.label+' ?',description:'Cette correction sera conservée après les prochains imports et recalculs.',label:'Confirmer',action:async()=>{await setCorrection(selected.id,c.action,network);setMessages(['La correction de cette portion a été enregistrée.'])}})}>{c.label}</button>)}</div></section>}<div className="map-footer"><span><Icon name="map" size={16}/>Commune de Lyon · réseau OpenStreetMap</span><span>Marchez. Courez. Explorez.</span></div></section><div className="bottom-tip"><span className="tip-number">01 — 100</span><p>Pas besoin d’aller plus vite.<br/><strong>Juste un peu plus loin, dans une nouvelle rue.</strong></p><button className="text-button" onClick={() => setPage('Progression')}>Voir toutes les rues<Icon name="arrow"/></button></div></>}
        {page === 'Progression' && <><ProgressOverview zones={zones} district={district} onSelect={id=>{setDistrict(id);setReviewFocus('');setFocusStreet('')}}/>{corrections&&<ProgressHistory network={network} activities={activities} corrections={corrections} district={district}/>} <section className="panel"><div className="section-bar"><h2>Les rues de Lyon <span className="count-badge">{streets.length}</span></h2><span className="muted">Regroupées par nom</span></div><div className="street-tools"><div className="filters" aria-label="Filtrer les rues">{['Toutes','Terminées','En cours','Non commencées'].map(f => <button className={filter === f ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div><label className="search"><Icon name="search"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher une rue…" aria-label="Chercher une rue"/></label></div><p className="table-note">{filtered.length} rue(s) · Les voies sans nom comptent dans le total, mais pas dans cette liste.</p><div className="street-list">{filtered.map(s => <div className="street-row" key={s.name}><div><strong>{s.name}</strong><span>{km(s.done)} / {km(s.total)} km · {s.status}</span><button className="text-button" onClick={()=>{setReviewFocus('');setFocusStreet(s.name);setSelected(network.segments.find(unit=>unit.name.normalize('NFC').trim()===s.name));setPage('Carte')}}>Retrouver sur la carte</button></div><div className="street-meter"><div className="progress-track"><span style={{ width: `${100*s.done/s.total}%` }}/></div><strong>{percentText(100*s.done/s.total, s.done>=s.total)} %</strong></div></div>)}{!filtered.length && <p className="empty-copy">Aucune rue ne correspond à cette recherche.</p>}</div></section></>}
        {page === 'Activités' && <><section className="panel"><div className="section-bar"><h2>Votre carnet de sorties <span className="count-badge">{activities.length}</span></h2><button className="button primary" disabled={busy} onClick={() => picker.current?.click()}><Icon name="upload"/>Importer</button></div>{!activities.length ? <div className="empty-state"><Icon name="activity" size={42}/><h3>Votre prochaine sortie commence ici.</h3><p>Exportez une sortie au format GPX ou TCX, puis importez-la pour voir les rues parcourues.</p><button className="button primary" disabled={busy} onClick={() => picker.current?.click()}>Importer ma première sortie</button></div> : <div className="activities-list">{[...activities].sort((a,b) => (b.date || b.importedAt).localeCompare(a.date || a.importedAt)).map(a => <article className="activity-row" key={a.id}><div className="activity-symbol"><Icon name="activity"/></div><div className="activity-description"><h3>{a.name}</h3><p>{dateText(a.date)} · {km(a.distanceMeters)} km</p><small>À l’import : +{km(a.newMeters)} km de nouvelles rues · {a.newSegments} nouvelles portions · +{(100*a.newMeters/network.totalMeters).toLocaleString('fr-FR',{maximumFractionDigits:2})} % de Lyon</small></div><div className="activity-actions"><button className="button" disabled={busy} onClick={()=>{setReviewActivityId(a.id);setPage('À vérifier');window.scrollTo({top:0})}}>Vérifier le GPS</button><button className="button subtle" onClick={() => { setReviewFocus('');setFocusStreet('');setDistrict(0);setSelected(undefined);setTracks(a.tracks); setPage('Carte') }}>Comparer au GPS</button><button className="icon-button danger" disabled={busy} aria-label={`Supprimer ${a.name}`} onClick={() => confirmDelete(a)}><Icon name="trash"/></button></div></article>)}</div>}</section></>}
        {page === 'À vérifier' && <><section className="panel setting-panel"><h2>Choisir une sortie à examiner</h2><p>Cette section recherche des indices de GPS imprécis ou de voies parallèles. Rien n’est validé automatiquement : vous comparez la trace puis décidez.</p><label className="review-picker">Sortie <select value={activities.some(a=>a.id===reviewActivityId)?reviewActivityId:''} disabled={busy||!activities.length} onChange={e=>setReviewActivityId(e.target.value)}><option value="">Sélectionner une sortie…</option>{[...activities].sort((a,b)=>(b.date||b.importedAt).localeCompare(a.date||a.importedAt)).map(a=><option key={a.id} value={a.id}>{dateText(a.date)} — {a.name}</option>)}</select></label>{!activities.length&&<p>Importez d’abord une sortie GPX depuis la carte ou les activités.</p>}<small>La vérification porte sur une sortie à la fois pour garder l’application réactive. Les corrections et suggestions ignorées sont conservées.</small></section>{activities.find(a=>a.id===reviewActivityId)&&corrections&&<ReviewPanel activity={activities.find(a=>a.id===reviewActivityId)!} network={network} corrections={corrections} busy={busy} onClose={()=>setReviewActivityId('')} onInspect={s=>{setFocusStreet('');setDistrict(0);setSelected(s);setTracks(activities.find(a=>a.id===reviewActivityId)!.tracks);setReviewFocus(s.id);setMapFilter('Toutes');setPage('Carte');window.scrollTo({top:0})}} onDecide={(s,action)=>{
          if(action==='ignore'){void mutate(()=>ignoreReview(reviewActivityId,s.id,network.version));return}
          setConfirmation({title:action==='include'?'Confirmer cette portion parcourue ?':'Retirer cette portion de la progression ?',description:`Cette correction concerne les ${s.lengthMeters.toFixed(1)} mètres de la portion entière, pour toutes vos sorties. Vous pourrez revenir au calcul automatique depuis la carte.`,label:'Confirmer',action:async()=>{await setCorrection(s.id,action,network);setMessages(['La correction a été enregistrée.'])}})
        }} onReset={()=>setConfirmation({title:'Réafficher les suggestions ignorées ?',description:'Les suggestions de cette sortie seront de nouveau visibles. Votre progression ne change pas.',label:'Réafficher',action:()=>clearIgnoredReviews(reviewActivityId)})}/>}</>}
        {page === 'Réglages'  && <div className="settings-grid"><section className="panel setting-panel"><span className="eyebrow">À VOTRE GOÛT</span><h2>Apparence</h2><label className="theme-picker">Thème <select value={theme} disabled={busy} onChange={e=>void mutate(async()=>{await setTheme(e.target.value as Theme)})}><option value="system">Système</option><option value="light">Clair</option><option value="dark">Sombre</option></select></label><p>Le mode Système suit l’apparence de votre appareil. Ce choix est conservé sur cet appareil ; le fond de carte conserve ses couleurs d’origine.</p></section><section className="panel setting-panel"><span className="eyebrow">VOTRE PROGRESSION EST PRÉCIEUSE</span><h2>Sauvegardes</h2><p>Vos sorties restent dans ce navigateur, sur cet appareil. Exportez régulièrement une sauvegarde : un effacement des données du navigateur peut les supprimer.</p><div className="setting-buttons"><button className="button primary" onClick={() => void backup()} disabled={busy}><Icon name="download"/>Exporter ma sauvegarde</button><button className="button" onClick={() => backupPicker.current?.click()} disabled={busy}><Icon name="upload"/>Restaurer un fichier JSON</button></div><small>La restauration remplace les données de cet appareil après confirmation. Pas de synchronisation automatique entre Mac et iPhone.</small></section><section className="panel setting-panel"><span className="eyebrow">UNE CARTE DANS LA POCHE</span><h2>Installer sur iPhone</h2><ol><li>Ouvrez l’adresse HTTPS de Lyon 100 dans Safari.</li><li>Touchez Partager, puis « Sur l’écran d’accueil ».</li><li>Activez « Ouvrir comme app web » si proposé, puis Ajouter.</li><li>Utilisez ensuite l’icône Lyon 100 pour vos imports.</li></ol><p className="small">Après le premier chargement complet, l’application et les rues sont disponibles hors ligne. Le fond cartographique nécessite une connexion.</p></section><section className="panel setting-panel"><span className="eyebrow">COMMENT ÇA MARCHE</span><h2>Reconnaissance des rues</h2><dl className="parameters"><div><dt>Tolérance GPS habituelle</dt><dd>{GPS_TOLERANCE_METERS} mètres</dd></div><div><dt>Rue large sans voie concurrente</dt><dd>Jusqu’à {WIDE_STREET_TOLERANCE_METERS} m, après {WIDE_STREET_MIN_FOLLOW_METERS} m suivis dans la même direction</dd></div><div><dt>Petits trous entre deux passages</dt><dd>Raccordement unique de {CONTINUITY_MAX_METERS} m maximum, connecté et appuyé par la même trace GPS</dd></div><div><dt>Rue terminée</dt><dd>{STREET_COMPLETION_THRESHOLD*100} % réellement parcourus</dd></div><div><dt>Unité de couverture</dt><dd>{SEGMENT_MAX_METERS} m maximum, fractions conservées</dd></div><div><dt>Échantillonnage</dt><dd>Tous les {SAMPLE_INTERVAL_METERS} m maximum</dd></div><div><dt>Écart de direction accepté</dt><dd>{MAX_HEADING_DIFFERENCE_DEGREES}° maximum</dd></div></dl><p className="small">Le GPS peut confondre des rues parallèles proches, ponts et tunnels. La progression est une estimation sur le réseau éligible, figé pour cette V1.</p></section><section className="panel setting-panel"><span className="eyebrow">DONNÉES & TRANSPARENCE</span><h2>Le réseau lyonnais</h2><p>{network.segments.length.toLocaleString('fr-FR')} segments · {km(network.totalMeters)} km</p><p className="small">{network.source}<br/>Source du {dateText(network.sourceDate)}<br/>Réseau : <code>{network.version}</code><br/>Application : 1.10.0-dev.2</p><p className="small"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a>. Les tuiles ne sont pas téléchargées en masse.</p></section><section className="panel setting-panel reset-panel"><h2>Repartir de zéro</h2><p>Supprime toutes les sorties et leur progression sur cet appareil. Exportez une sauvegarde avant de continuer.</p><button className="button danger" disabled={busy} onClick={() => setConfirmation({ title: 'Effacer toutes vos sorties ?', description: 'Cette action supprime toutes les activités de cet appareil. Seule une sauvegarde JSON permettra de les retrouver.', label: 'Tout réinitialiser', action: async () => { await resetData(); setTracks([]); setMessages(['Vos données personnelles ont été réinitialisées.']) } })}><Icon name="trash"/>Réinitialiser mes données</button></section></div>}
      </>}
    </main><footer className="app-footer"><span>LYON 100 <span className="footer-separator">/</span> Votre ville, autrement.</span><UpdateNotice busy={busy}/><span>Local. Personnel. Sans compte.</span></footer>
    {dragging && <div className="drop-overlay"><Icon name="upload" size={42}/><h2>Déposez vos sorties GPX ou TCX ici</h2></div>}
    {confirmation && <div className="modal-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onKeyDown={e => { if(e.key === 'Escape') setConfirmation(null); if(e.key === 'Tab') { const buttons=Array.from(e.currentTarget.querySelectorAll('button')); const first=buttons[0],last=buttons.at(-1); if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus()} else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus()} } }}><h2 id="confirm-title">{confirmation.title}</h2><p id="confirm-description">{confirmation.description}</p><div className="dialog-actions"><button className="button" autoFocus onClick={() => setConfirmation(null)}>Annuler</button><button className="button danger" onClick={() => { const action = confirmation.action; setConfirmation(null); void mutate(action) }}>{confirmation.label}</button></div></section></div>}
  </div>
}
export default App

