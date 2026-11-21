import { useId } from 'react'
import { cn } from '@/lib/utils'

const JET =
  'M0 -6 C0.9 -6 1.2 -4.8 1.2 -3.6 L1.2 -1.2 L6 1.8 L6 3.1 L1.2 1.7 L1.2 4 L2.9 5.4 L2.9 6.4 L0 5.7 L-2.9 6.4 L-2.9 5.4 L-1.2 4 L-1.2 1.7 L-6 3.1 L-6 1.8 L-1.2 -1.2 L-1.2 -3.6 C-1.2 -4.8 -0.9 -6 0 -6 Z'

/**
 * Charterline mark: the "C" of Charterline drawn as a flight path. It
 * departs from a dot at the lower right, sweeps around, and ends in a jet
 * flying along the route. Blue route and white jet on a near-black tile, so it
 * stands apart from the blue buttons beside it. public/favicon.svg matches.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('h-7 w-7 shrink-0', className)}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2438" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill={`url(#${id}-bg)`} />
      {/* the route, shaped as a C */}
      <path d="M21.6 22.1 A8.6 8.6 0 1 1 19.6 8.2" fill="none" stroke="#3b7bff" strokeWidth="2.6" strokeLinecap="round" />
      {/* departure point */}
      <circle cx="21.6" cy="22.1" r="2.1" fill="#3b7bff" />
      {/* jet, flying along the route */}
      <path transform="translate(23.6 10.9) rotate(126) scale(0.68)" fill="#fff" d={JET} />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-foreground', className)}>
      <LogoMark />
      <span>
        Charter<span className="text-primary">line</span>
      </span>
    </span>
  )
}
