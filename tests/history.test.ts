import { describe, expect, it } from 'vitest'
import { buildHistory, dayInParis, historyPeriods, periodKey, recentGains, type HistoryActivity, type HistorySegment } from '../src/stats/history'
import type { Coverage } from '../src/types'
const segments:HistorySegment[]=[{id:'a',lengthMeters:100,district:1},{id:'b',lengthMeters:50,district:2}]
const activity=(id:string,date:string|null,coverage:Coverage,importedAt='2026-10-20T10:00:00Z'):HistoryActivity=>({id,date,coverage,segmentIds:Object.keys(coverage),importedAt})

describe('chronological unique coverage',()=>{
  it('sorts actual dates instead of imports and credits only new fractions',()=>{
    const later=activity('later','2026-10-05T10:00:00Z',{a:[[.5,1]],b:[[0,1]]})
    const first=activity('first','2026-09-30T10:00:00Z',{a:[[0,.6]]})
    const h=buildHistory(segments,[later,first])
    expect(h.days.map(d=>d.gained[0])).toEqual([60,90])
    expect(h.days.map(d=>d.cumulative[0])).toEqual([60,150])
    expect(h.days[1].cumulative.slice(1).reduce((a,b)=>a+b,0)).toBe(150)
    expect(h.days[1].cumulative[1]).toBe(100)
    expect(h.days[1].cumulative[2]).toBe(50)
    expect(h.totals[0]).toBe(150)
    expect(h.totals.slice(1).reduce((a,b)=>a+b,0)).toBe(150)
  })
  it('merges same-day sessions and repeated coverage without mutating input',()=>{
    const items=[activity('a','2026-10-04T10:00:00Z',{a:[[0,1]]}),activity('b','2026-10-04T11:00:00Z',{a:[[0,1]]})]
    const before=JSON.stringify(items)
    const h=buildHistory(segments,items)
    expect(h.days).toHaveLength(1);expect(h.days[0].gained[0]).toBe(100)
    expect(JSON.stringify(items)).toBe(before)
  })
  it('reconstructs gains after deletion of shared coverage',()=>{
    const first=activity('a','2026-10-01T10:00:00Z',{a:[[0,.6]]})
    const later=activity('b','2026-10-05T10:00:00Z',{a:[[.5,1]]})
    expect(buildHistory(segments,[first,later]).days[1].gained[0]).toBe(40)
    expect(buildHistory(segments,[later]).days[0].gained[0]).toBe(50)
    expect(buildHistory(segments,[]).days).toEqual([])
  })
  it('removes present exclusions from the fixed baseline and every past period',()=>{
    const h=buildHistory(segments,[activity('a','2026-10-01',{a:[[0,1]],b:[[0,.5]]})],['a'])
    expect(h.totals[0]).toBe(50);expect(h.days[0].gained[0]).toBe(25)
    expect(h.totals[1]).toBe(0);expect(h.days[0].cumulative[1]).toBe(0)
  })
  it('uses importedAt only for undated activities and reports unusable dates',()=>{
    const h=buildHistory(segments,[activity('a',null,{a:[[0,1]]}),activity('b',null,{},'invalid')])
    expect(h.undated).toBe(1);expect(h.skipped).toBe(1)
    expect(h.days[0].date).toBe('2026-10-20')
  })
  it('ignores unknown segment IDs and supports legacy full-unit coverage',()=>{
    const h=buildHistory(segments,[{id:'old',date:'2026-10-01',importedAt:'2026-10-01',segmentIds:['a','missing']}])
    expect(h.days[0].cumulative[0]).toBe(100)
  })
})
describe('calendar and recent periods',()=>{
  it('uses Paris dates through summer/winter transitions and midnight',()=>{
    expect(dayInParis('2026-03-29T22:30:00Z')).toBe('2026-03-30')
    expect(dayInParis('2026-10-25T23:30:00Z')).toBe('2026-10-26')
    expect(dayInParis('invalid')).toBeNull()
    expect(periodKey('2027-01-01','week')).toBe('2026-12-28')
    expect(periodKey('2026-10-04','week')).toBe('2026-09-28')
    expect(periodKey('2026-10-05','week')).toBe('2026-10-05')
  })
  it('fills inactive months without inventing gains and carries cumulative values',()=>{
    const h=buildHistory(segments,[activity('a','2026-01-31T12:00:00Z',{a:[[0,.5]]}),activity('b','2026-03-01T12:00:00Z',{a:[[.5,1]]})])
    const rows=historyPeriods(h,'month','2026-04-08')
    expect(rows.map(r=>r.gained[0])).toEqual([50,0,50,0])
    expect(rows.map(r=>r.cumulative[0])).toEqual([50,50,100,100])
    expect(rows.map(r=>r.date)).toEqual(['2026-01-01','2026-02-01','2026-03-01','2026-04-01'])
  })
  it('groups weekly across a year boundary',()=>{
    const h=buildHistory(segments,[activity('a','2026-12-31T23:30:00Z',{a:[[0,.5]]}),activity('b','2027-01-04T12:00:00Z',{a:[[.5,1]]})])
    expect(historyPeriods(h,'week','2027-01-04').map(r=>r.date)).toEqual(['2026-12-28','2027-01-04'])
  })
  it('recent summaries respect month/week, district and exclude future dates',()=>{
    const h=buildHistory(segments,[activity('a','2026-10-01',{a:[[0,.5]]}),activity('b','2026-10-27',{b:[[0,1]]}),activity('c','2026-11-01',{a:[[.5,1]]})])
    expect(recentGains(h,'2026-10-28','week',0)).toBe(50)
    expect(recentGains(h,'2026-10-28','month',0)).toBe(100)
    expect(recentGains(h,'2026-10-28','week',1)).toBe(0)
    expect(historyPeriods(buildHistory(segments,[]),'month','2026-10-28')).toEqual([])
  })
  it('equals the current automatic union for many overlapping activities',()=>{
    const activities=Array.from({length:100},(_,i)=>activity(String(i),`2026-10-${String(i%28+1).padStart(2,'0')}T10:00:00Z`,{a:[[i%10/10,Math.min(1,i%10/10+.2)]]}))
    const h=buildHistory(segments,activities)
    expect(h.days.at(-1)!.cumulative[0]).toBeCloseTo(100,8)
    expect(h.days.reduce((sum,d)=>sum+d.gained[0],0)).toBeCloseTo(100,8)
  })
})
