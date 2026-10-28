export type Coordinate = [number, number]
export interface TrackPoint { coordinates: Coordinate; time: string | null }
export interface NormalizedActivity { name: string; date: string | null; tracks: TrackPoint[][]; distanceMeters: number; gaps: number }
export type ParsedActivity = NormalizedActivity
/** Fractions along a unit, in [0,1]. Only observed/routed portions count. */
export type Interval = [number, number]
export type Coverage = Record<string, Interval[]>
export interface Segment { connector?: boolean; id: string; osmWayId: string; name: string; highway: string; access?: string; foot?: string; footway?: string; layer?: string; bridge?: string; coordinates: Coordinate[]; lengthMeters: number; startNode?: string; endNode?: string; district?: number }
export interface District { id: number; name: string; boundary: GeoJSON.MultiPolygon | GeoJSON.Polygon }
export interface Network { schemaVersion: 1; version: string; generatedAt: string; source: string; sourceDate: string; sourceHash: string; boundary: GeoJSON.MultiPolygon | GeoJSON.Polygon; districts?: District[]; segments: Segment[]; connectors?: Segment[]; totalMeters: number }
export interface Activity extends NormalizedActivity { id: string; fileName: string; rawHash: string; contentHash: string; importedAt: string; networkVersion: string; matchingVersion: string; segmentIds: string[]; coverage?: Coverage; newMeters: number; newSegments: number }
export interface MatchResult { segmentIds: string[]; coverage?: Coverage }
export interface Correction { segmentId: string; action: 'include' | 'remove' | 'exclude'; updatedAt: string; networkVersion: string }
