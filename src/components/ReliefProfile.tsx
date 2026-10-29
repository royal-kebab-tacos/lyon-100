import type {Relief} from '../routing/relief'
export function ReliefProfile({relief}:{relief:Relief}){
 const known=relief.profile.filter(p=>p.elevation!==null)
 if(!known.length)return <p>Relief indisponible : ce parcours ne peut pas être présenté comme peu pentu.</p>
 const coverage=Math.min(100,Math.floor(100*relief.knownMeters/Math.max(1,relief.totalMeters)+1e-8)),min=Math.min(...known.map(p=>p.elevation!)),max=Math.max(...known.map(p=>p.elevation!)),span=Math.max(10,max-min),paths:string[]=[]
 let current=''
 for(const p of relief.profile){if(p.elevation===null){if(current)paths.push(current);current='';continue}const x=10+280*p.meters/Math.max(1,relief.totalMeters),y=65-50*(p.elevation-min)/span;current+=`${current?' L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}
 if(current)paths.push(current)
 return <div className="relief-profile"><p><strong>D+ estimé : {Math.round(relief.up)} m</strong> · D− : {Math.round(relief.down)} m{coverage<100&&<> · relief renseigné sur {coverage} % du trajet</>}</p><small>Altitude estimée : {Math.round(min)}–{Math.round(max)} m</small><svg viewBox="0 0 300 90" role="img" aria-label={`Profil altimétrique estimé, de ${Math.round(min)} à ${Math.round(max)} mètres d’altitude`}><path d="M10 70H290" stroke="currentColor" opacity=".3"/>{paths.map((d,i)=><path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="2"/>)}<text x="10" y="85" fontSize="10">Départ</text><text x="290" y="85" fontSize="10" textAnchor="end">Retour</text></svg>{coverage<100&&<small>Profil incomplet : les passages sans altitude fiable, notamment ponts et tunnels, restent inconnus.</small>}</div>
}
