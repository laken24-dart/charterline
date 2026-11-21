import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { STATUS_STYLES } from '../lib/client'

export function StatusPill({ status, className }: { status?: string; className?: string }) {
  const s = status ?? 'open'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider',
        STATUS_STYLES[s] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {s}
    </span>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      {children}
    </select>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-lg border border-border bg-card', className)}>{children}</section>
}

export function PanelHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  )
}

export function Route({ from, to, className }: { from: string; to: string; className?: string }) {
  return (
    <span className={cn('font-code text-sm', className)}>
      {from} <span className="text-muted-foreground">→</span> {to}
    </span>
  )
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
