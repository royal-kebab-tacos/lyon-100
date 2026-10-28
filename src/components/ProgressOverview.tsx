import { km, percentText } from '../stats/progress'
import { MILESTONES, reachedMilestone, zoneHighlights, type ZoneSummary } from '../stats/zones'
export function ProgressOverview({ zones, district, onSelect }: { zones: ZoneSummary[]; district: number; onSelect: (id: number) => void }) {
  const { leading, closest } = zoneHighlights(zones)
  return <section aria-label="Vue d’ensemble de Lyon">
    <div className="overview-highlights">
      <div className="panel setting-panel"><h2>Le plus avancé</h2><p>{leading ? `Lyon ${leading.id} · ${percentText(leading.percent, leading.remainingMeters <= 1e-8)} % parcourus` : 'Votre première sortie fera apparaître votre arrondissement le plus avancé.'}</p></div>
      <div className="panel setting-panel"><h2>Le plus proche des 100 %</h2><p>{closest ? `Lyon ${closest.id} · ${km(closest.remainingMeters)} km restants` : 'Tous les arrondissements éligibles sont parcourus.'}</p><small>Parmi les arrondissements non terminés, selon les kilomètres restants.</small></div>
    </div>
    <p className="milestone-note">Vos étapes : 25 %, 50 %, 75 %, 100 % des kilomètres éligibles. Les portions restantes continuent de compter même lorsqu’une rue est indiquée terminée.</p>
    <div className="district-grid">{zones.map(z => <button className={district === z.id ? 'district-card selected' : 'district-card'} aria-pressed={district === z.id} key={z.id} onClick={() => onSelect(z.id)}>
      <strong>{z.id ? `Lyon ${z.id}` : 'Tout Lyon'} — {percentText(z.percent, z.totalMeters > 0 && z.remainingMeters <= 1e-8)} %</strong>
      <span>{km(z.meters)} / {km(z.totalMeters)} km</span>
      <small>{km(z.remainingMeters)} km restants · {z.completedStreets}/{z.streets} rues terminées</small>
      <span className="milestones">{MILESTONES.map(m => <span key={m} className={reachedMilestone(z,m) ? 'milestone reached' : 'milestone'} aria-label={`${m} % : ${reachedMilestone(z,m) ? 'atteint' : 'à atteindre'}`}>{reachedMilestone(z,m) ? '✓ ' : ''}{m} %</span>)}</span>
    </button>)}</div>
  </section>
}
