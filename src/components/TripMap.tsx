/**
 * Live route map. Re-renders whenever the `trips` array changes, which the
 * records subscription pushes in real time — a trip an operator posts
 * appears on every open board within a moment.
 */

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Trip } from '../schemas/aviation-schemas'
import { usd } from '../lib/client'

export interface MapTrip {
  recordId: string
  data: Trip
}

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** Points along the great circle between two coordinates (for curved routes). */
function greatCircle(a: [number, number], b: [number, number], steps = 48): [number, number][] {
  const [lat1, lon1] = [toRad(a[0]), toRad(a[1])]
  const [lat2, lon2] = [toRad(b[0]), toRad(b[1])]
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    )
  if (d === 0) return [a, b]
  const pts: [number, number][] = []
  let prevLng: number | null = null
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    let lng = toDeg(Math.atan2(y, x))
    // Keep the line continuous across the antimeridian.
    if (prevLng !== null) {
      while (lng - prevLng > 180) lng -= 360
      while (lng - prevLng < -180) lng += 360
    }
    prevLng = lng
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng])
  }
  return pts
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function TripMap({
  trips,
  selectedId,
  onSelect,
  className,
  fitKey,
}: {
  trips: MapTrip[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  className?: string
  /** Change this to re-fit the viewport (e.g. when filters change). */
  fitKey?: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const lastFit = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, {
      center: [35, -40],
      zoom: 3,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 12,
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    // The container may size after mount (flex layouts).
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const bounds: L.LatLngExpression[] = []
    for (const t of trips) {
      const d = t.data
      if (d.originLat == null || d.originLng == null || d.destinationLat == null || d.destinationLng == null) continue
      const selected = t.recordId === selectedId
      const path = greatCircle([d.originLat, d.originLng], [d.destinationLat, d.destinationLng])
      const line = L.polyline(path, {
        color: selected ? '#f5b83d' : '#7aa7ff',
        weight: selected ? 3.5 : 2,
        opacity: selected ? 1 : 0.65,
        dashArray: d.status === 'open' ? undefined : '4 6',
      })
      // Wide invisible hit target so thin routes are easy to click.
      const hit = L.polyline(path, { color: '#000', opacity: 0, weight: 16 })
      const popup = `<div style="min-width:180px">
          <div style="font-weight:600;margin-bottom:2px">${escapeHtml(d.title)}</div>
          <div class="font-code" style="font-size:12px;opacity:.8">${escapeHtml(d.origin)} → ${escapeHtml(d.destination)}</div>
          <div style="font-size:12px;margin-top:4px">${escapeHtml(d.aircraft)} · ${usd(d.dayRate)}/day</div>
        </div>`
      for (const l of [line, hit]) {
        l.bindTooltip(popup, { sticky: true, direction: 'top', opacity: 1 })
        l.on('click', () => onSelectRef.current?.(t.recordId))
        l.addTo(g)
      }
      const dot = (cls: string) => L.divIcon({ className: '', html: `<div class="airport-dot ${cls}"></div>`, iconSize: [10, 10] })
      const last = path[path.length - 1]
      L.marker([d.originLat, d.originLng], { icon: dot('') })
        .bindTooltip(`<span class="font-code">${escapeHtml(d.origin)}</span>`, { direction: 'top' })
        .on('click', () => onSelectRef.current?.(t.recordId))
        .addTo(g)
      L.marker(last, { icon: dot('dest') })
        .bindTooltip(`<span class="font-code">${escapeHtml(d.destination)}</span>`, { direction: 'top' })
        .on('click', () => onSelectRef.current?.(t.recordId))
        .addTo(g)
      if (selected) line.bringToFront()
      bounds.push([d.originLat, d.originLng], last)
    }
    if (bounds.length && lastFit.current !== (fitKey ?? 'default')) {
      lastFit.current = fitKey ?? 'default'
      m.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 6 })
    }
  }, [trips, selectedId, fitKey])

  // Pan to the selected route.
  useEffect(() => {
    const m = map.current
    const t = trips.find((x) => x.recordId === selectedId)
    if (!m || !t?.data.originLat || t.data.destinationLat == null) return
    m.flyToBounds(
      L.latLngBounds([
        [t.data.originLat, t.data.originLng!],
        [t.data.destinationLat, t.data.destinationLng!],
      ]),
      { padding: [60, 60], maxZoom: 6, duration: 0.6 },
    )
  }, [selectedId])

  return <div ref={el} className={className} data-testid="trip-map" />
}
