import {loadRoutingDataset,type RoutingDataset} from './load'
import {runRoutingRequest} from './engine'
import type {RouteMessage} from './protocol'
let dataset:Promise<RoutingDataset>|undefined
self.onmessage=async(event:MessageEvent<RouteMessage>)=>{
 const {id,request}=event.data
 try{
  dataset??=loadRoutingDataset(request.networkVersion,percent=>self.postMessage({id,progress:percent})).catch(error=>{dataset=undefined;throw error})
  const data=await dataset
  self.postMessage({id,phase:'calcul'})
  self.postMessage({id,result:runRoutingRequest(data,request)})
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Le calcul du parcours a échoué.'})}
}
