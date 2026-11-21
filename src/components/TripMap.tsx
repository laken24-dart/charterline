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

type LandGeo = GeoJSON.FeatureCollection | GeoJSON.Feature
let landPromise: Promise<LandGeo> | null = null
function loadLand(): Promise<LandGeo> {
  landPromise ??= Promise.all([
    import('topojson-client'),
    import('world-atlas/countries-50m.json'),
  ]).then(([topo, data]) => {
    const world = (data as { default?: unknown }).default ?? data
    const t = world as Parameters<typeof topo.feature>[0] & { objects: { countries: Parameters<typeof topo.feature>[1] } }
    const geo = topo.feature(t, t.objects.countries) as LandGeo
    // Antarctica can't be drawn in Web Mercator (the pole is at infinity) and
    // its outline wraps the whole globe, so it renders as a broken slab. No
    // business-aviation route goes there; leave it out.
    if (geo.type === 'FeatureCollection') geo.features = geo.features.filter((f) => String(f.id) !== '010')
    return unwrapAntimeridian(geo)
  })
  return landPromise
}

/**
 * Rings that cross ±180° (eastern Russia, Fiji) jump from 180 to -180 and
 * draw a band across the whole map. Shift their western points east so each
 * ring is continuous; the -360/+360 world copies cover the other side.
 */
function unwrapAntimeridian(geo: LandGeo): LandGeo {
  const fixRing = (ring: number[][]) => {
    const lngs = ring.map((c) => c[0])
    if (Math.max(...lngs) - Math.min(...lngs) <= 180) return ring
    return ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat])
  }
  const features = geo.type === 'FeatureCollection' ? geo.features : [geo]
  for (const f of features) {
    const g = f.geometry
    if (g?.type === 'Polygon') g.coordinates = g.coordinates.map(fixRing)
    else if (g?.type === 'MultiPolygon') g.coordinates = g.coordinates.map((poly) => poly.map(fixRing))
  }
  return geo
}

export interface MapTrip {
  recordId: string
  data: Trip
}

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** Points along the great circle between two coordinates (for curved routes). */
function greatCircle(a: [number, number], b: [number, number], steps = 160): [number, number][] {
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

/**
 * The drawn route: the great circle, bowed gently to one side so every
 * route — even a short, nearly straight hop — reads as a smooth flight arc.
 */
function flightArc(a: [number, number], b: [number, number]): [number, number][] {
  const pts = greatCircle(a, b)
  const [lat0, lng0] = pts[0]
  const [lat1, lng1] = pts[pts.length - 1]
  const dLat = lat1 - lat0
  const dLng = lng1 - lng0
  const len = Math.hypot(dLat, dLng)
  if (len === 0) return pts
  // Unit normal pointing "up" (north-ish), so arcs bow the same way a
  // departures map draws them.
  let nLat = dLng / len
  let nLng = -dLat / len
  if (nLat < 0) {
    nLat = -nLat
    nLng = -nLng
  }
  const bow = Math.min(len * 0.12, 6)
  return pts.map(([lat, lng], i) => {
    const k = Math.sin((Math.PI * i) / (pts.length - 1)) * bow
    return [lat + nLat * k, lng + nLng * k] as [number, number]
  })
}

/**
 * Leaflet rounds every projected vertex to a whole pixel
 * (Map.latLngToLayerPoint), which turns a finely sampled curve into a
 * stair-step when zoomed in. This polyline keeps sub-pixel positions; the SVG
 * renderer accepts fractional coordinates and anti-aliases them smoothly.
 */
type ProjectCtx = { _map: L.Map }
const SmoothPolyline = L.Polyline.extend({
  _projectLatlngs(this: ProjectCtx & { _projectLatlngs: (...a: unknown[]) => void }, latlngs: unknown[], result: L.Point[][], bounds: L.Bounds) {
    if (latlngs[0] instanceof L.LatLng) {
      const origin = this._map.getPixelOrigin()
      const ring = (latlngs as L.LatLng[]).map((ll) => this._map.project(ll).subtract(origin))
      ring.forEach((pt) => bounds.extend(pt))
      result.push(ring)
    } else {
      for (const part of latlngs) this._projectLatlngs(part, result, bounds)
    }
  },
}) as unknown as new (latlngs: L.LatLngExpression[], options?: L.PolylineOptions) => L.Polyline

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
      // Keep panning between the Southern Ocean and the Arctic; east-west
      // stays open across the world copies.
      maxBounds: L.latLngBounds([-60, -540], [84, 540]),
      maxBoundsViscosity: 1,
      zoomControl: true,
      attributionControl: true,
    })
    m.setMaxZoom(8)
    m.attributionControl.setPrefix('')
    m.attributionControl.addAttribution('Boundaries © <a href="https://www.naturalearthdata.com/">Natural Earth</a>')
    // Basemap: Natural Earth land drawn from data bundled with the app, so
    // the map never depends on (or needs an API key for) a tile service.
    // Loaded lazily to keep it out of the first paint.
    // Land gets its own pane under the routes (overlayPane is z 400), so it
    // can arrive after the routes without covering them.
    m.createPane('land').style.zIndex = '250'
    const base = L.layerGroup().addTo(m)
    void loadLand().then((land) => {
      if (!map.current) return
      for (const offset of [-360, 0, 360]) {
        L.geoJSON(land, {
          interactive: false,
          pane: 'land',
          coordsToLatLng: (c) => L.latLng(c[1], c[0] + offset),
          style: { color: '#c9d3e1', weight: 0.7, fillColor: '#ffffff', fillOpacity: 1 },
        }).addTo(base)
      }
    })
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
      const path = flightArc([d.originLat, d.originLng], [d.destinationLat, d.destinationLng])
      // smoothFactor 0: no point dropping at any zoom, so curves stay smooth.
      const smooth = { smoothFactor: 0, lineCap: 'round' as const, lineJoin: 'round' as const }
      if (selected) {
        // Soft white halo under the selected route lifts it off the map.
        new SmoothPolyline(path, { ...smooth, color: '#ffffff', weight: 8, opacity: 0.9, interactive: false }).addTo(g)
      }
      const line = new SmoothPolyline(path, {
        ...smooth,
        color: selected ? '#1d4ed8' : '#4f7fe8',
        weight: selected ? 3.2 : 2,
        opacity: selected ? 1 : 0.75,
        dashArray: d.status === 'open' ? undefined : '4 6',
      })
      // Wide invisible hit target so thin routes are easy to click.
      const hit = new SmoothPolyline(path, { ...smooth, color: '#000', opacity: 0, weight: 16 })
      // Compact hover label. The selected route gets none: it is already
      // highlighted, and its details are open in the list.
      const label = `<span class="font-code">${escapeHtml(d.origin)} → ${escapeHtml(d.destination)}</span><span class="route-tip-sep">·</span>${usd(d.dayRate)}/day`
      for (const l of [line, hit]) {
        if (!selected) l.bindTooltip(label, { sticky: true, direction: 'top', offset: [0, -8], className: 'route-tip', opacity: 1 })
        l.on('click', () => {
          l.closeTooltip()
          onSelectRef.current?.(t.recordId)
        })
        l.addTo(g)
      }
      const dot = (cls: string) => L.divIcon({ className: '', html: `<div class="airport-dot ${cls}"></div>`, iconSize: [10, 10] })
      const last = path[path.length - 1]
      L.marker([d.originLat, d.originLng], { icon: dot('') })
        .bindTooltip(`<span class="font-code">${escapeHtml(d.origin)}</span>`, { direction: 'top', offset: [0, -6], className: 'route-tip' })
        .on('click', () => onSelectRef.current?.(t.recordId))
        .addTo(g)
      L.marker(last, { icon: dot('dest') })
        .bindTooltip(`<span class="font-code">${escapeHtml(d.destination)}</span>`, { direction: 'top', offset: [0, -6], className: 'route-tip' })
        .on('click', () => onSelectRef.current?.(t.recordId))
        .addTo(g)
      if (selected) line.bringToFront()
      bounds.push([d.originLat, d.originLng], last)
    }
    if (bounds.length && lastFit.current !== (fitKey ?? 'default')) {
      lastFit.current = fitKey ?? 'default'
      m.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 5 })
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
