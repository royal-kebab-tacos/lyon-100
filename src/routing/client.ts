import type {RouteRequest,RouteResponse} from './protocol'
export function createRouteClient(factory=()=>new Worker(new URL('./loops.worker.ts',import.meta.url),{type:'module'})){
 let worker:Worker|undefined,sequence=0,pending:{reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|undefined
 const cancel=()=>{sequence++;worker?.terminate();worker=undefined;if(pending){clearTimeout(pending.timer);pending.reject(new DOMException('Calcul annulé','AbortError'));pending=undefined}}
 return {
  cancel,
  request(request:RouteRequest,onProgress:(message:string)=>void):Promise<RouteResponse>{
   if(pending)cancel()
   const id=++sequence
   worker??=factory()
   return new Promise((resolve,reject)=>{
    const fail=(error:Error)=>{if(id!==sequence||!pending)return;clearTimeout(pending.timer);pending=undefined;worker?.terminate();worker=undefined;reject(error)}
    pending={reject,timer:setTimeout(()=>fail(new Error('Le chargement ou le calcul prend trop de temps. Réessayez avec une connexion.')),90000)}
    worker!.onerror=()=>fail(new Error('Le calcul a été interrompu. Réessayez ; votre progression est conservée.'))
    worker!.onmessage=e=>{
     if(id!==sequence||e.data.id!==id||!pending)return
     if(e.data.error){fail(new Error(e.data.error));return}
     if(e.data.progress!==undefined){onProgress(`Chargement des parcours : ${e.data.progress} %`);return}
     if(e.data.phase){onProgress('Calcul des parcours…');return}
     if(e.data.result){clearTimeout(pending.timer);pending=undefined;resolve(e.data.result)}
    }
    try{worker!.postMessage({id,request})}catch(e){fail(e instanceof Error?e:new Error('Impossible de lancer le calcul.'))}
   })
  },
 }
}
