import type { Activity, Coverage, Segment } from '../types'
import { activityCoverage, fraction, mergeIntervals } from './progress'
export type HistoryActivity = Pick<Activity, 'id' | 'date' | 'importedAt' | 'coverage' | 'segmentIds'>
export type HistorySegment = Pick<Segment, 'id' | 'district' | 'lengthMeters'>
export interface HistoryRow { date: string; gained: number[]; cumulative: number[] }
export interface HistoryResult { days: HistoryRow[]; totals: number[]; undated: number; skipped: number }
export type Period = 'week' | 'month'
const parisDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
export function dayInParis(value: string): string | null {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const parts = parisDate.formatToParts(date)
  return ['year','month','day'].map(t => parts.find(p => p.type === t)!.value).join('-')
}
export function periodKey(day: string, period: Period): string {
  if (period === 'month') return day.slice(0,7) + '-01'
  const d = new Date(day + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7)
  return d.toISOString().slice(0,10)
}
function nextPeriod(day: string, period: Period): string {
  const d = new Date(day + 'T12:00:00Z')
  if (period === 'month') d.setUTCMonth(d.getUTCMonth()+1)
  else d.setUTCDate(d.getUTCDate()+7)
  return d.toISOString().slice(0,10)
}
const zero = () => Array<number>(10).fill(0)
/** Reconstruct from activity dates. Current exclusions define the fixed eligible network.
 * Include/remove corrections have no reliable historical journal and are not backdated.
 * Only changed units are processed; no full-network scan for each activity/date. */
export function buildHistory(segments: HistorySegment[], activities: HistoryActivity[], excludedIds: string[] = []): HistoryResult {
  const excluded = new Set(excludedIds)
  const index = new Map<string, HistorySegment>()
  const totals = zero(), cumulative = zero(), coverage: Coverage = {}
  for (const s of segments) {
    if (excluded.has(s.id)) continue
    index.set(s.id, s); totals[0] += s.lengthMeters
    if (s.district && s.district >= 1 && s.district <= 9) totals[s.district] += s.lengthMeters
  }
  let undated = 0, skipped = 0
  const sorted = activities.flatMap(a => {
    const valid = a.date && Number.isFinite(Date.parse(a.date))
    const date = valid ? a.date! : a.importedAt
    const day = dayInParis(date)
    if (!day) { skipped++; return [] }
    if (!valid) undated++
    return [{ a, date, day }]
  }).sort((a,b) => Date.parse(a.date)-Date.parse(b.date) || a.a.id.localeCompare(b.a.id))
  const days: HistoryRow[] = []
  for (const {a,day} of sorted) {
    let row = days.at(-1)
    if (!row || row.date !== day) { row = { date: day, gained: zero(), cumulative: [...cumulative] }; days.push(row) }
    for (const [id,ranges] of Object.entries(activityCoverage(a))) {
      const s = index.get(id)
      if (!s) continue
      const before = coverage[id] || []
      const after = mergeIntervals([...before,...ranges])
      const gained = Math.max(0, fraction(after)-fraction(before))*s.lengthMeters
      coverage[id] = after
      for (const zone of s.district && s.district >= 1 && s.district <= 9 ? [0,s.district] : [0]) {
        cumulative[zone] += gained; row.gained[zone] += gained
      }
    }
    row.cumulative = [...cumulative]
  }
  return { days, totals, undated, skipped }
}
/** Include inactive periods with zero gains, through the current period (or latest activity). */
export function historyPeriods(history: HistoryResult, period: Period, today: string): HistoryRow[] {
  if (!history.days.length) return []
  const grouped = new Map<string, HistoryRow>()
  for (const day of history.days) {
    const date = periodKey(day.date,period)
    const row = grouped.get(date) || { date, gained: zero(), cumulative: zero() }
    day.gained.forEach((gain,i) => row.gained[i] += gain)
    row.cumulative = [...day.cumulative]; grouped.set(date,row)
  }
  const result: HistoryRow[] = []
  const last = periodKey(history.days.at(-1)!.date > today ? history.days.at(-1)!.date : today,period)
  let cumulative = zero()
  for (let date = periodKey(history.days[0].date,period); date <= last; date = nextPeriod(date,period)) {
    const row = grouped.get(date)
    if (row) cumulative = row.cumulative
    result.push(row || { date, gained: zero(), cumulative: [...cumulative] })
  }
  return result
}
export function recentGains(history: HistoryResult, today: string, period: Period, district: number): number {
  const start = periodKey(today,period)
  return history.days.reduce((sum,day) => sum + (day.date >= start && day.date <= today ? day.gained[district] : 0),0)
}
