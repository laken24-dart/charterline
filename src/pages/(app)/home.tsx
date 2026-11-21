/**
 * The board — every open contract trip on a live map and in a list.
 * Works signed out (trips are public); applying needs a crew account.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { Plane, Search } from 'lucide-react'
import { TripMap } from '../../components/TripMap'
import { NativeSelect, Route, StatusPill } from '../../components/bits'
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

  const fitKey = `${rating}|${mine}|${q}`
  const isCrew = profile?.accountType === 'crew'

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* List */}
      <aside className="order-2 flex min-h-0 flex-col border-border lg:order-1 lg:w-[420px] lg:shrink-0 lg:border-r">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Contract trips</h1>
            <span className="tabular text-xs text-muted-foreground" data-testid="trip-count">
              {status === 'loading' ? '…' : `${trips.length} open`}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Airport, aircraft, operator…"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Type rating">
              <option value="">All type ratings</option>
              {ratingsOnBoard.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="w-36">
              <option value="soonest">Soonest</option>
              <option value="rate">Highest rate</option>
              <option value="newest">Newest</option>
            </NativeSelect>
          </div>
          {isCrew && (profile?.typeRatings?.length ?? 0) > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[#f5b83d]" />
              Only trips matching my type ratings
            </label>
          )}
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto" data-testid="trip-list">
          {status === 'loading' &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </li>
            ))}
          {status !== 'loading' && trips.length === 0 && (
            <li className="px-6 py-14 text-center">
              <Plane className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No open trips match</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.accountType === 'operator' ? (
                  <>
                    <Link to="/post" className="text-primary hover:underline">
                      Post the first trip
                    </Link>{' '}
                    — it appears here for every pilot instantly.
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
            return (
              <li key={t.recordId}>
                <button
                  onClick={() => setSelected(t.recordId)}
                  className={cn(
                    'block w-full px-4 py-3.5 text-left transition-colors hover:bg-accent/50',
                    selected === t.recordId && 'bg-accent/70',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.company}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-sm font-semibold text-foreground">{usd(d.dayRate)}</p>
                      <p className="text-[11px] text-muted-foreground">per day</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <Route from={d.origin} to={d.destination} className="text-xs text-foreground" />
                    <span>{d.aircraft}</span>
                    <span className="tabular">
                      {dateRange(d.startDate, d.endDate)} · {tripDays(d.startDate, d.endDate)}d
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'font-code rounded border px-1.5 py-0.5 text-[11px]',
                        match ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground',
                      )}
                    >
                      {ratingCode(d.typeRating)}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.seat}</span>
                  </div>
                </button>
                {selected === t.recordId && (
                  <div className="flex items-center justify-between gap-2 bg-accent/70 px-4 pb-3">
                    <StatusPill status={d.status} />
                    <Link
                      to={`/trips/${t.recordId}`}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      data-testid="open-trip"
                    >
                      {isCrew ? 'View & apply' : 'View trip'}
                    </Link>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Map */}
      <div className="relative order-1 h-[42vh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
        <TripMap trips={trips} selectedId={selected} onSelect={setSelected} fitKey={fitKey} className="absolute inset-0" />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-md border border-border bg-background/80 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live — new trips appear as they're posted
        </div>
      </div>
    </div>
  )
}
