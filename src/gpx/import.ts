import { parseGpx } from './parse'
import { MAX_GPX_BYTES } from '../utils/config'
import type { NormalizedActivity } from '../types'
export function parseActivity(text:string,fileName:string):NormalizedActivity {
  const name=fileName.replace(/\.gz$/i,'')
  if(/\.gpx$/i.test(name))return parseGpx(text,name)
  if(!/\.tcx$/i.test(name))throw new Error('Ce format n’est pas encore pris en charge. Choisissez un fichier GPX ou TCX, éventuellement compressé en .gz.')
  if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('Ce fichier TCX est invalide.')
  const input=new DOMParser().parseFromString(text,'application/xml')
  if(input.getElementsByTagNameNS('*','parsererror').length||input.documentElement.localName!=='TrainingCenterDatabase')throw new Error('Ce fichier TCX est invalide.')
  const output=document.implementation.createDocument(null,'gpx'),trk=output.createElement('trk'),title=output.createElement('name')
  title.textContent=input.getElementsByTagNameNS('*','Name')[0]?.textContent||name.replace(/\.tcx$/i,'');trk.append(title);output.documentElement.append(trk)
  for(const track of Array.from(input.getElementsByTagNameNS('*','Track'))){
    const segment=output.createElement('trkseg');trk.append(segment)
    for(const p of Array.from(track.getElementsByTagNameNS('*','Trackpoint'))){
      const point=output.createElement('trkpt'),lat=p.getElementsByTagNameNS('*','LatitudeDegrees')[0]?.textContent,lon=p.getElementsByTagNameNS('*','LongitudeDegrees')[0]?.textContent
      // Missing GPS points interrupt the line through the shared GPX normalizer.
      if(lat&&lon){point.setAttribute('lat',lat);point.setAttribute('lon',lon)}
      const time=output.createElement('time');time.textContent=p.getElementsByTagNameNS('*','Time')[0]?.textContent||'';point.append(time);segment.append(point)
    }
  }
  try{return parseGpx(new XMLSerializer().serializeToString(output),name)}catch{throw new Error('Ce fichier TCX ne contient pas de trajet GPS exploitable.')}
}
export async function readActivityFile(file:File):Promise<{text:string;parsed:NormalizedActivity}>{
  if(file.size>MAX_GPX_BYTES)throw new Error('Ce fichier dépasse la limite de 20 Mo.')
  let text:string
  if(/\.gz$/i.test(file.name)){
    try{
      const reader=file.stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks:Uint8Array[]=[]
      let size=0
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_GPX_BYTES){await reader.cancel();throw new Error('limit')}chunks.push(value)}
      const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length}text=new TextDecoder().decode(all)
    }catch{throw new Error('Ce fichier compressé est invalide ou dépasse 20 Mo une fois décompressé.')}
  }else text=await file.text()
  return {text,parsed:parseActivity(text,file.name)}
}
