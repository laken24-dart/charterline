/** Equirectangular projection shared with scripts/make-world-dots.mjs. */
export const MAP_W = 1000
export const MAP_TOP = 78
export const MAP_BOTTOM = -58
export const MAP_H = (MAP_W * (MAP_TOP - MAP_BOTTOM)) / 360

export function project(lat: number, lng: number): [number, number] {
  return [((lng + 180) / 360) * MAP_W, ((MAP_TOP - lat) / (MAP_TOP - MAP_BOTTOM)) * MAP_H]
}

/** A gentle arc between two projected points (quadratic Bézier path). */
export function arcPath(a: [number, number], b: [number, number]): string {
  const [x1, y1] = a
  const [x2, y2] = b
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const lift = Math.hypot(x2 - x1, y2 - y1) * 0.28
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${(my - lift).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}
