import { cn } from '@/lib/utils'

/** Charterline mark: a swept route arc with a departure point, in a blue tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('h-7 w-7', className)}>
      <rect width="32" height="32" rx="8" fill="#1d4ed8" />
      <path d="M7 22 C 12 9, 20 8, 25 11" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="7" cy="22" r="2.6" fill="#fff" />
      <path d="M25 11 l-4.2 -1.6 l1.3 2.4 l-1.9 2.1 z" fill="#fff" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground', className)}>
      <LogoMark />
      Charterline
    </span>
  )
}
