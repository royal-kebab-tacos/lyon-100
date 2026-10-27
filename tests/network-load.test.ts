import { afterEach, expect, it, vi } from 'vitest'
import { loadNetworkParts } from '../src/osm/load'
afterEach(() => vi.unstubAllGlobals())
it('réunit les parties sans modifier les identifiants ni leur ordre', async () => {
 const fetch = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({version:'same',parts:['data/network-aaaaaaaaaaaaaaaa.json','data/network-bbbbbbbbbbbbbbbb.json']})}).mockResolvedValueOnce({ok:true,json:async()=>[{id:'a'}]}).mockResolvedValueOnce({ok:true,json:async()=>[{id:'b'}]})
 vi.stubGlobal('fetch',fetch)
 expect(await loadNetworkParts()).toEqual({version:'same',segments:[{id:'a'},{id:'b'}]})
})
it('refuse un chargement partiel si une partie est indisponible', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({parts:['data/network-aaaaaaaaaaaaaaaa.json']})}).mockResolvedValueOnce({ok:false}))
 await expect(loadNetworkParts()).rejects.toThrow('indisponible')
})
it('refuse un index vide ou une URL extérieure', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({parts:['https://example.com/network.json']})}))
 await expect(loadNetworkParts()).rejects.toThrow('incomplètes')
})
