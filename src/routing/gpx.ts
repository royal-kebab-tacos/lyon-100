import type {LoopProposal} from './loops'
import {validCoordinate} from '../utils/geometry'
const escapeXml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')
export type ExportOutcome='shared'|'downloaded'|'cancelled'
export type ExportMode='auto'|'download'
function description(loop:LoopProposal){
 const parts=['Parcours proposé, pas une activité réalisée.',`Distance indicative : ${(loop.meters/1000).toFixed(2)} km.`,`Nouvelles portions estimées : ${(loop.newMeters/1000).toFixed(2)} km.`]
 if(loop.relief){const r=loop.relief;if(r.knownMeters>0)parts.push(`D+ estimé : ${Math.round(r.up)} m ; D− estimé : ${Math.round(r.down)} m. Relief renseigné sur ${Math.min(100,Math.floor(100*r.knownMeters/Math.max(1,r.totalMeters)))} % du trajet. Terrain IGN RGE ALTI — Licence Ouverte 2.0.`);else parts.push('Relief indisponible.')}
 parts.push('© OpenStreetMap contributors — ODbL. Vérifier les accès sur place.')
 return escapeXml(parts.join(' '))
}
export function loopGpx(loop:LoopProposal,name='Lyon 100 — parcours proposé'):string{
 const c=loop.coordinates
 if(c.length<2||c.length>100000||!c.every(validCoordinate)||c[0][0]!==c.at(-1)![0]||c[0][1]!==c.at(-1)![1])throw Error('Le tracé ne peut pas être exporté : la boucle est incomplète.')
 return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Lyon 100" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${escapeXml(name)}</name><desc>${description(loop)}</desc></metadata><trk><name>${escapeXml(name)}</name><desc>${description(loop)}</desc><trkseg>${c.map(([lon,lat])=>`<trkpt lat="${lat}" lon="${lon}"/>`).join('')}</trkseg></trk></gpx>\n`
}
/** Direct download stays available even when a browser advertises a broken share sheet. */
export async function exportLoop(loop:LoopProposal,mode:ExportMode='auto'):Promise<ExportOutcome>{
 const file=new File([loopGpx(loop)],`lyon-100-boucle-${(loop.meters/1000).toFixed(1)}km.gpx`,{type:'application/gpx+xml'})
 if(mode==='auto'){
  try{
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({files:[file],title:'Parcours Lyon 100'});return 'shared'
   }
  }catch(e){if(e&&typeof e==='object'&&'name' in e&&e.name==='AbortError')return 'cancelled'}
 }
 const url=URL.createObjectURL(file),a=document.createElement('a')
 try{a.href=url;a.download=file.name;document.body.append(a);a.click()}
 finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
 return 'downloaded'
}
