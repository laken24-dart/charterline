// Generates public/world-dots.svg — a dotted equirectangular land map used by
// the landing hero. Run: node scripts/make-world-dots.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url)))
const land = feature(topo, topo.objects.land)
const polys = land.features.flatMap((f) =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
)
function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const onLand = (lng, lat) => polys.some((p) => inRing(lng, lat, p[0]) && !p.slice(1).some((h) => inRing(lng, lat, h)))

// Shared projection with src/lib/projection.ts
const W = 1000, TOP = 78, BOTTOM = -58, H = (W * (TOP - BOTTOM)) / 360
const STEP = 1.8
let d = ''
for (let lat = TOP - STEP / 2; lat > BOTTOM; lat -= STEP) {
  for (let lng = -180 + STEP / 2; lng < 180; lng += STEP) {
    if (!onLand(lng, lat)) continue
    const x = ((lng + 180) / 360) * W
    const y = ((TOP - lat) / (TOP - BOTTOM)) * H
    d += `M${x.toFixed(1)} ${y.toFixed(1)}h0`
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.toFixed(1)}"><path d="${d}" stroke="#aab8cc" stroke-width="2.9" stroke-linecap="round" fill="none"/></svg>\n`
writeFileSync(new URL('../public/world-dots.svg', import.meta.url), svg)
console.log(`wrote public/world-dots.svg (${(svg.length / 1024).toFixed(0)} KiB)`)
