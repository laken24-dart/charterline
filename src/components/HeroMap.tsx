/**
 * Landing hero graphic: a dotted world map with live-looking flight routes.
 * Pure SVG + SMIL/CSS animation, so it prerenders to static HTML and needs no
 * JavaScript (or map service) to play. Illustrative only — not live data.
 */

import { CalendarCheck, FileCheck2, Plane } from 'lucide-react'
import { findAirport } from '../lib/airports'
import { MAP_H, MAP_W, arcPath, project } from '../lib/projection'

const ROUTES: Array<[string, string]> = [
  ['KTEB', 'KASE'],
  ['KVNY', 'MMSD'],
  ['KPBI', 'TFFJ'],
  ['KTEB', 'EGLF'],
  ['LFPB', 'LFMN'],
  ['OMDW', 'LSGG'],
  ['KSDL', 'KBZN'],
  ['KOPF', 'MYNN'],
  ['EGGW', 'LIEO'],
  ['KBED', 'BIKF'],
  ['KDAL', 'MMUN'],
]

// Crop to the North Atlantic, where these routes live, so the map reads large.
const VIEW = { x: 135, y: 22, w: 540, h: 205 }

const PLANE = 'M4.5 0 L-3.2 -3.2 L-1.6 0 L-3.2 3.2 Z'

export function HeroMap() {
  const routes = ROUTES.flatMap(([a, b], i) => {
    const o = findAirport(a)
    const d = findAirport(b)
    if (!o || !d) return []
    const p1 = project(o.lat, o.lng)
    const p2 = project(d.lat, d.lng)
    return [{ id: `r${i}`, d: arcPath(p1, p2), p1, p2, codes: [a, b] as const, delay: i * 0.18, dur: 5 + (i % 4) }]
  })

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Contract trips · live map</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            live
          </span>
        </div>
        <div className="relative bg-[linear-gradient(180deg,#f9fbfe,#eef3fa)]">
          <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="block h-auto w-full" aria-hidden>
            <image href="/world-dots.svg" x={0} y={0} width={MAP_W} height={MAP_H} />
            <defs>
              <linearGradient id="route-grad" x1="0" x2="1">
                <stop offset="0" stopColor="#0b1220" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            {routes.map((r) => (
              <g key={r.id}>
                <path id={r.id} d={r.d} pathLength={1} fill="none" stroke="url(#route-grad)" strokeWidth={1.3} strokeLinecap="round" className="route-draw" style={{ animationDelay: `${r.delay}s` }} />
                <circle cx={r.p1[0]} cy={r.p1[1]} r={2.4} fill="#0b1220" stroke="#fff" strokeWidth={1} />
                <circle cx={r.p2[0]} cy={r.p2[1]} r={2.4} fill="#1d4ed8" stroke="#fff" strokeWidth={1} />
                <circle cx={r.p2[0]} cy={r.p2[1]} r={2.4} fill="none" stroke="#2563eb" strokeWidth={0.8}>
                  <animate attributeName="r" values="2.4;10" dur="2.4s" begin={`${r.delay}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="2.4s" begin={`${r.delay}s`} repeatCount="indefinite" />
                </circle>
                <path d={PLANE} fill="#1d4ed8">
                  <animateMotion dur={`${r.dur}s`} begin={`${r.delay + 1.2}s`} repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                    <mpath href={`#${r.id}`} />
                  </animateMotion>
                </path>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Floating product moments */}
      <div className="float-slow absolute -left-10 -bottom-10 hidden w-60 rounded-xl border border-border bg-white p-3 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Plane className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Ski week · Aspen</p>
            <p className="font-code text-[11px] text-muted-foreground">KTEB → KASE · G-IV</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Mar 6 – 9 · PIC</span>
          <span className="tabular font-semibold">$1,800/day</span>
        </div>
      </div>
      <div className="float-slow absolute -right-8 -top-8 hidden w-56 rounded-xl border border-border bg-white p-3 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] sm:block" style={{ animationDelay: '1.5s' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success"><FileCheck2 className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-semibold">ATP + G-IV type rating</p>
            <p className="text-[11px] text-muted-foreground">Shared with the hiring operator only</p>
          </div>
        </div>
      </div>
      <div className="float-slow absolute -bottom-5 right-6 hidden items-center gap-2 rounded-full border border-border bg-[#0b1220] px-3.5 py-2 text-xs font-medium text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.6)] sm:flex" style={{ animationDelay: '3s' }}>
        <CalendarCheck className="h-3.5 w-3.5 text-[#93b4ff]" /> Interview booked · Thu 10:00
      </div>
    </div>
  )
}
