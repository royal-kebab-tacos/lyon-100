import type { Network } from '../types'
import { validCoordinate } from '../utils/geometry'
async function fetchData(path: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`).catch(() => { throw new Error('Le réseau des rues n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.') })
  if (!response.ok) throw new Error('Le réseau des rues est indisponible. Vérifiez votre connexion puis rechargez Lyon 100.')
  return response.json()
}
export async function loadNetwork(): Promise<Network> {
  const n: Network = import.meta.env.PROD
    ? await loadNetworkParts()
    : await fetchData('data/lyon-network.json')
  if (n.schemaVersion !== 1 || typeof n.version !== 'string' || !n.sourceHash || !n.boundary || !Array.isArray(n.segments) || !n.segments.length || n.segments.some(s => !s.id || !Number.isFinite(s.lengthMeters) || s.lengthMeters <= 0 || s.lengthMeters > 10.05 || s.coordinates.length < 2 || !s.coordinates.every(validCoordinate)) || new Set(n.segments.map(s => s.id)).size !== n.segments.length || Math.abs(n.segments.reduce((sum, s) => sum + s.lengthMeters, 0) - n.totalMeters) > 0.01) throw new Error('Le réseau des rues est incomplet. Préparez à nouveau les données OSM avant de continuer.')
  return n
}

export async function loadNetworkParts(): Promise<Network> {
  const { parts, ...metadata } = await fetchData('data/network-index.json')
  if (!Array.isArray(parts) || !parts.length || parts.length > 100 || parts.some((p: unknown) => typeof p !== 'string' || !/^data\/network-[a-f0-9]{16}\.json$/.test(p))) throw new Error('Les données de la carte sont incomplètes. Rechargez Lyon 100.')
  const segments: Network['segments'] = []
  for (const path of parts) {
    const part = await fetchData(path)
    if (!Array.isArray(part)) throw new Error('Les données de la carte sont incomplètes. Rechargez Lyon 100.')
    segments.push(...part)
  }
  return { ...metadata, segments } as Network
}
