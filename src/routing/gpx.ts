import type {LoopProposal} from './loops'
import {validCoordinate} from '../utils/geometry'
const escapeXml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')
export function loopGpx(loop:LoopProposal,name='Lyon 100 — parcours proposé'):string{
 const c=loop.coordinates
 if(c.length<2||c.length>100000||!c.every(validCoordinate)||c[0][0]!==c.at(-1)![0]||c[0][1]!==c.at(-1)![1])throw Error('Le tracé ne peut pas être exporté : la boucle est incomplète.')
 return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Lyon 100" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${escapeXml(name)}</name><desc>Parcours proposé, pas une activité réalisée. © OpenStreetMap contributors — ODbL. Vérifier les accès sur place.</desc></metadata><trk><name>${escapeXml(name)}</name><trkseg>${c.map(([lon,lat])=>`<trkpt lat="${lat}" lon="${lon}"/>`).join('')}</trkseg></trk></gpx>\n`
}
export async function exportLoop(loop:LoopProposal){
 const file=new File([loopGpx(loop)],`lyon-100-boucle-${(loop.meters/1000).toFixed(1)}km.gpx`,{type:'application/gpx+xml'})
 if(navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file],title:'Parcours Lyon 100'});return}catch(e){if(e&&typeof e==='object'&&'name' in e&&e.name==='AbortError')return}
 }
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
