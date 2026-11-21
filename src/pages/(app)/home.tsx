/**
 * The board — every open contract trip on a live map and in a list.
 * Works signed out (trips are public); applying needs a crew account.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ArrowRight, CalendarDays, Plane, Search } from 'lucide-react'
import { TripMap } from '../../components/TripMap'
import { NativeSelect } from '../../components/bits'
import { dateRange, tripDays, useMyProfile, usd } from '../../lib/client'
import { ratingCode } from '../../lib/airports'
import type { Trip } from '../../schemas/aviation-schemas'
import { cn } from '@/lib/utils'

type Sort = 'soonest' | 'rate' | 'newest'

export default function Board() {
  const { records, status } = useQuery<Trip>('trips', { orderBy: 'createdAt', orderDir: 'desc', limit: 500 })
  const { profile } = useMyProfile()
  const [q, setQ] = useState('')
  const [rating, setRating] = useState('')
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState<Sort>('soonest')
  const [selected, setSelected] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const myRatings = useMemo(() => new Set((profile?.typeRatings ?? []).map(ratingCode)), [profile])

  const ratingsOnBoard = useMemo(
    () => [...new Set(records.map((r) => ratingCode(r.data.typeRating)))].sort(),
    [records],
  )

  const trips = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = records.filter((r) => {
      const d = r.data
      if (d.status !== 'open') return false
      if ((d.endDate ?? '9999') < today) return false
      if (rating && ratingCode(d.typeRating) !== rating) return false
      if (mine && !myRatings.has(ratingCode(d.typeRating))) return false
      if (!needle) return true
      return [d.title, d.origin, d.destination, d.originName, d.destinationName, d.aircraft, d.company, d.typeRating]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(needle))
    })
    list.sort((a, b) => {
      if (sort === 'rate') return (b.data.dayRate ?? 0) - (a.data.dayRate ?? 0)
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      return (a.data.startDate ?? '').localeCompare(b.data.startDate ?? '')
    })
    return list
  }, [records, q, rating, mine, myRatings, sort, today])

  const fitKey = `${rating}|${mine}|${q}|${trips.length > 0}`
  const isCrew = profile?.accountType === 'crew'
  const topRate = trips.reduce((m, t) => Math.max(m, t.data.dayRate ?? 0), 0)

  return (
    <div className="flex h-full flex-col bg-background lg:flex-row">
      {/* List */}
      <aside className="order-2 flex min-h-0 flex-col border-border bg-white lg:order-1 lg:w-[440px] lg:shrink-0 lg:border-r">
        <div className="space-y-3 border-b border-border p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#0b1220]">Contract trips</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Click a route on the map or a trip below.</p>
            </div>
            <span className="tabular rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary" data-testid="trip-count">
              {status === 'loading' ? '…' : `${trips.length} open`}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Airport, aircraft, operator…"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:bg-white focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Type rating" className="rounded-lg">
              <option value="">All type ratings</option>
              {ratingsOnBoard.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="w-40 rounded-lg">
              <option value="soonest">Soonest</option>
              <option value="rate">Highest rate</option>
              <option value="newest">Newest</option>
            </NativeSelect>
          </div>
          {isCrew && (profile?.typeRatings?.length ?? 0) > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[#1d4ed8]" />
              Only trips matching my type ratings
            </label>
          )}
        </div>

        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-background/60 p-3" data-testid="trip-list">
          {status === 'loading' &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-2 rounded-xl border border-border bg-white p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </li>
            ))}
          {status !== 'loading' && trips.length === 0 && (
            <li className="rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
                <Plane className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">No open trips match</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.accountType === 'operator' ? (
                  <>
                    <Link to="/post" className="font-medium text-primary hover:underline">
                      Post a trip
                    </Link>{' '}
                    and it appears here for every pilot instantly.
                  </>
                ) : (
                  'New trips appear here the moment an operator posts them.'
                )}
              </p>
            </li>
          )}
          {trips.map((t) => {
            const d = t.data
            const match = myRatings.has(ratingCode(d.typeRating))
            const active = selected === t.recordId
            const days = tripDays(d.startDate, d.endDate)
            return (
              <li key={t.recordId}>
                <div
                  className={cn(
                    'group rounded-xl border bg-white transition-all',
                    active
                      ? 'border-primary shadow-[0_8px_24px_-12px_rgba(29,78,216,0.55)] ring-1 ring-primary'
                      : 'border-border hover:border-[#c7d3e6] hover:shadow-[0_6px_20px_-10px_rgba(15,23,42,0.25)]',
                  )}
                >
                  <button onClick={() => setSelected(t.recordId)} className="block w-full p-4 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[#0b1220]">{d.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.company}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-[15px] font-semibold text-[#0b1220]">{usd(d.dayRate)}</p>
                        <p className="text-[11px] text-muted-foreground">per day</p>
                      </div>
                    </div>
                    {/* Route strip */}
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                      <span className="font-code text-sm font-semibold text-[#0b1220]">{d.origin}</span>
                      <span className="relative h-px flex-1 bg-[repeating-linear-gradient(90deg,#9fb2d0_0_4px,transparent_4px_8px)]">
                        <Plane className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 bg-background px-0.5 text-primary" />
                      </span>
                      <span className="font-code text-sm font-semibold text-[#0b1220]">{d.destination}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          'font-code rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                          match ? 'bg-primary text-white' : 'bg-accent text-primary',
                        )}
                        title={match ? 'Matches your type ratings' : d.typeRating}
                      >
                        {ratingCode(d.typeRating)}
                      </span>
                      <span className="truncate">{d.aircraft}</span>
                      <span className="text-border">•</span>
                      <span className="inline-flex items-center gap-1 tabular">
                        <CalendarDays className="h-3.5 w-3.5" /> {dateRange(d.startDate, d.endDate)} · {days}d
                      </span>
                      <span className="text-border">•</span>
                      <span>{d.seat}</span>
                    </div>
                  </button>
                  {active && (
                    <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
                      <span className="tabular text-xs text-muted-foreground">
                        Contract value <span className="font-semibold text-[#0b1220]">{usd((d.dayRate ?? 0) * days)}</span>
                      </span>
                      <Link
                        to={`/trips/${t.recordId}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]"
                        data-testid="open-trip"
                      >
                        {isCrew ? 'View & apply' : 'View trip'} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Map */}
      <div className="relative order-1 h-[46vh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
        <TripMap trips={trips} selectedId={selected} onSelect={setSelected} fitKey={fitKey} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] flex -translate-x-1/2 items-center gap-4 rounded-full border border-border bg-white/95 px-4 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] backdrop-blur">
          <span className="flex items-center gap-2 font-medium text-[#0b1220]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </span>
          <span className="tabular text-muted-foreground"><span className="font-semibold text-[#0b1220]">{trips.length}</span> routes</span>
          {topRate > 0 && (
            <span className="tabular hidden text-muted-foreground sm:inline">
              top rate <span className="font-semibold text-[#0b1220]">{usd(topRate)}</span>/day
            </span>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden items-center gap-3 rounded-lg border border-border bg-white/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm sm:flex">
          <span className="flex items-center gap-1.5"><span className="airport-dot inline-block !h-2.5 !w-2.5" /> Origin</span>
          <span className="flex items-center gap-1.5"><span className="airport-dot dest inline-block !h-2.5 !w-2.5" /> Destination</span>
        </div>
      </div>
    </div>
  )
}
