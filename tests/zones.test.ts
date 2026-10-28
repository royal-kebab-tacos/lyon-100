import { describe, expect, it } from 'vitest'
import { zoneSummaries, zoneHighlights, reachedMilestone } from '../src/stats/zones'
import { validTheme } from '../src/settings/theme'
import type { Activity, Network } from '../src/types'
const network = { segments: [
  {id:'a',name:'Rue partagée',district:1,lengthMeters:100},
  {id:'b',name:'Rue partagée',district:2,lengthMeters:100},
  {id:'c',name:'',district:2,lengthMeters:50},
], totalMeters:250 } as Network
const activity = (coverage: Activity['coverage']) => ({segmentIds:Object.keys(coverage!),coverage}) as Activity

describe('overview uses real coverage', () => {
  it('merges shared coverage, counts border units once and separates status from milestones', () => {
    const zones=zoneSummaries(network,[activity({a:[[0,.6]]}),activity({a:[[.5,.96]],b:[[0,.5]]})],[])
    expect(zones[0].meters).toBe(146)
    expect(zones.slice(1).reduce((sum,z)=>sum+z.meters,0)).toBe(zones[0].meters)
    expect(zones.slice(1).reduce((sum,z)=>sum+z.totalMeters,0)).toBe(250)
    expect(zones[1].completedStreets).toBe(1)
    expect(zones[0].streets).toBe(1)
    expect(reachedMilestone(zones[1],100)).toBe(false)
    expect(reachedMilestone(zones[1],75)).toBe(true)
  })
  it('applies manual exclusions/removals and recalculates after deletion', () => {
    const a=activity({a:[[0,1]],b:[[0,1]]})
    const zones=zoneSummaries(network,[a],[{segmentId:'b',action:'exclude',updatedAt:'',networkVersion:''},{segmentId:'a',action:'remove',updatedAt:'',networkVersion:''}])
    expect(zones[0].totalMeters).toBe(150);expect(zones[0].meters).toBe(0)
    expect(zoneSummaries(network,[],[])[0].meters).toBe(0)
  })
  it('chooses leading by percentage, closest by remaining km and excludes completed/empty zones', () => {
    const zones=zoneSummaries(network,[activity({a:[[0,.5]],b:[[0,.5]],c:[[0,1]]})],[])
    expect(zoneHighlights(zones).leading?.id).toBe(2)
    expect(zoneHighlights(zones).closest?.id).toBe(1)
    const complete=zoneSummaries(network,[activity({a:[[0,1]],b:[[0,1]],c:[[0,1]]})],[])
    expect(zoneHighlights(complete).closest).toBeUndefined()
    expect(reachedMilestone(complete[0],100)).toBe(true)
    expect(reachedMilestone(complete[9],100)).toBe(false)
    expect(zoneHighlights(zoneSummaries(network,[],[])).leading).toBeUndefined()
  })
  it('defaults unknown appearance preferences to the system', () => {
    expect(validTheme(undefined)).toBe('system');expect(validTheme('invalid')).toBe('system')
    expect(validTheme('dark')).toBe('dark');expect(validTheme('light')).toBe('light')
  })
})
