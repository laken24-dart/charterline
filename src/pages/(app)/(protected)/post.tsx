import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { Field, NativeSelect, Panel } from '../../../components/bits'
import { TripMap } from '../../../components/TripMap'
import { callAction, tripDays, useMyProfile, usd } from '../../../lib/client'
import { AIRPORTS, TYPE_RATINGS, findAirport } from '../../../lib/airports'
import { SEATS, type Trip } from '../../../schemas/aviation-schemas'

function isoToday(offset = 0) {
  const d = new Date(Date.now() + offset * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export default function PostTrip() {
  const { profile, loading } = useMyProfile()
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({
    title: '',
    origin: '',
    destination: '',
    aircraft: '',
    typeRating: '',
    seat: 'PIC',
    startDate: isoToday(7),
    endDate: isoToday(9),
    dayRate: '',
    minHours: '',
    notes: '',
  })
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))

  const preview = useMemo(() => {
    const o = findAirport(f.origin)
    const d = findAirport(f.destination)
    if (!o || !d) return []
    const data: Trip = {
      operatorId: '',
      title: f.title || 'New trip',
      origin: o.icao,
      originLat: o.lat,
      originLng: o.lng,
      destination: d.icao,
      destinationLat: d.lat,
      destinationLng: d.lng,
      aircraft: f.aircraft,
      typeRating: f.typeRating,
      dayRate: Number(f.dayRate) || 0,
      status: 'open',
    }
    return [{ recordId: 'preview', data }]
  }, [f.origin, f.destination, f.title, f.aircraft, f.typeRating, f.dayRate])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  if (profile?.accountType !== 'operator') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Operator accounts post trips</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile ? 'Your account is a crew account.' : 'Set up your account as an operator first.'}
        </p>
        <Link to={profile ? '/home' : '/profile'} className="mt-4 inline-block text-sm text-primary hover:underline">
          {profile ? 'Browse trips' : 'Set up account'} →
        </Link>
      </div>
    )
  }

  const days = tripDays(f.startDate, f.endDate)
  const valid =
    f.title.trim() && f.origin && f.destination && f.aircraft.trim() && f.typeRating && Number(f.dayRate) > 0 && f.endDate >= f.startDate

  async function submit() {
    setBusy(true)
    const res = await callAction<{ recordId: string }>('createTrip', { ...f, dayRate: Number(f.dayRate), minHours: Number(f.minHours) || 0 })
    setBusy(false)
    if (!res.success || !res.data) return toast.error('Could not post trip', res.error ?? '')
    toast.success('Trip is live', 'It is on the board for every pilot now.')
    navigate(`/trips/${res.data.recordId}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Post a contract trip</h1>
      <p className="mt-1 text-sm text-muted-foreground">Posting as {profile.company || profile.displayName}. It goes live on the map the moment you publish.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel className="space-y-5 p-5">
          <Field label="Trip title">
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Ski week — Aspen round trip" data-testid="trip-title" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Origin">
              <NativeSelect value={f.origin} onChange={(e) => set('origin', e.target.value)} data-testid="trip-origin">
                <option value="">Select airport</option>
                {AIRPORTS.map((a) => <option key={a.icao} value={a.icao}>{a.icao} · {a.name}, {a.city}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Destination">
              <NativeSelect value={f.destination} onChange={(e) => set('destination', e.target.value)} data-testid="trip-destination">
                <option value="">Select airport</option>
                {AIRPORTS.map((a) => <option key={a.icao} value={a.icao}>{a.icao} · {a.name}, {a.city}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Aircraft">
              <Input value={f.aircraft} onChange={(e) => set('aircraft', e.target.value)} placeholder="e.g. Gulfstream G450 · N123CL" data-testid="trip-aircraft" />
            </Field>
            <Field label="Required type rating">
              <NativeSelect value={f.typeRating} onChange={(e) => set('typeRating', e.target.value)} data-testid="trip-rating">
                <option value="">Select rating</option>
                {TYPE_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Start date">
              <Input type="date" value={f.startDate} min={isoToday()} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={f.endDate} min={f.startDate} onChange={(e) => set('endDate', e.target.value)} />
            </Field>
            <Field label="Day rate (USD)">
              <Input type="number" min={1} value={f.dayRate} onChange={(e) => set('dayRate', e.target.value)} placeholder="1500" data-testid="trip-rate" />
            </Field>
            <Field label="Seat">
              <NativeSelect value={f.seat} onChange={(e) => set('seat', e.target.value)}>
                {SEATS.map((s) => <option key={s} value={s}>{s}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Min. total time (hrs)" hint="Optional">
              <Input type="number" min={0} value={f.minHours} onChange={(e) => set('minHours', e.target.value)} />
            </Field>
          </div>
          <Field label="Details">
            <Textarea rows={4} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Legs, overnights, per diem, Part 91/135, recurrency requirements…" />
          </Field>
        </Panel>

        <div className="space-y-4">
          <Panel className="overflow-hidden">
            {preview.length ? (
              <TripMap trips={preview} selectedId="preview" className="h-56" fitKey={`${f.origin}-${f.destination}`} />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Pick a route to preview</div>
            )}
            <div className="space-y-1 border-t border-border p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Duty days</span><span className="tabular">{days > 0 ? days : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Est. contract value</span><span className="tabular font-semibold">{days > 0 && Number(f.dayRate) ? usd(days * Number(f.dayRate)) : '—'}</span></div>
            </div>
          </Panel>
          <Button className="w-full" size="lg" disabled={!valid} loading={busy} onClick={submit} data-testid="publish-trip">
            Publish trip
          </Button>
        </div>
      </div>
    </div>
  )
}
