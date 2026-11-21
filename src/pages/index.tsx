/**
 * Landing — a STATIC, prerendered page (no providers, no auth, no socket).
 * The live board lives at /home.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const SAMPLE_ROUTES = [
  { from: 'KTEB', to: 'KASE', ac: 'G-IV', rate: '$1,800' },
  { from: 'KVNY', to: 'MMSD', ac: 'CL-30', rate: '$1,450' },
  { from: 'KPBI', to: 'TFFJ', ac: 'PC-12', rate: '$950' },
  { from: 'LFPB', to: 'LSGG', ac: 'DA-7X', rate: '$2,100' },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span aria-hidden className="font-code flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">CL</span>
            Charterline
          </span>
          <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">Open the board →</Link>
        </header>

        <main className="mx-auto max-w-6xl px-6">
          <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
            <div>
              <p className="font-code text-xs uppercase tracking-[0.2em] text-primary">Contract crew · Private aviation</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Find the right type-rated pilot before wheels-up.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Operators post contract trips: route, aircraft, dates, day rate and the type rating it needs.
                Pilots see them on a live map, apply with their certificates and book the interview.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/home" className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Browse open trips
                </Link>
                <Link to="/profile" className="rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-accent">
                  Post a trip as an operator
                </Link>
              </div>
            </div>

            {/* Static "departures board" — illustrative, not live data. */}
            <div aria-hidden className="rounded-lg border border-border bg-card p-1 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="font-code text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Open contracts</span>
                <span className="flex items-center gap-1.5 text-[11px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> live
                </span>
              </div>
              <ul className="divide-y divide-border">
                {SAMPLE_ROUTES.map((r) => (
                  <li key={r.from + r.to} className="font-code grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 text-sm">
                    <span>
                      {r.from} <span className="text-muted-foreground">→</span> {r.to}
                    </span>
                    <span className="rounded border border-primary/40 px-1.5 py-0.5 text-[11px] text-primary">{r.ac}</span>
                    <span className="tabular text-right">{r.rate}<span className="text-muted-foreground">/d</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
            <div className="bg-background p-8">
              <h2 className="text-lg font-semibold">For operators</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><span className="font-code mr-2 text-primary">01</span>Post a trip with route, aircraft, dates, day rate and required rating.</li>
                <li><span className="font-code mr-2 text-primary">02</span>Review applicants and open their attached certificates.</li>
                <li><span className="font-code mr-2 text-primary">03</span>Publish interview times, message candidates and hire.</li>
              </ol>
            </div>
            <div className="bg-background p-8">
              <h2 className="text-lg font-semibold">For crew</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><span className="font-code mr-2 text-primary">01</span>Upload your certificates, medical and type ratings once.</li>
                <li><span className="font-code mr-2 text-primary">02</span>Filter the live map to trips matching your ratings.</li>
                <li><span className="font-code mr-2 text-primary">03</span>Apply, message the operator and book your interview slot.</li>
              </ol>
            </div>
          </section>

          <section className="py-16">
            <h2 className="text-lg font-semibold">Your documents stay yours</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Certificates are stored in your private folder. When you apply, only the operator of that trip can open
              the files you attach. Other pilots, other operators and the site's owner cannot. The server enforces
              this on every request, not just the interface.
            </p>
          </section>
        </main>

        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
            Charterline is a job board. Operators remain responsible for verifying certificates, currency and
            insurance requirements before any flight.
          </div>
        </footer>
      </div>
    </>
  )
}
