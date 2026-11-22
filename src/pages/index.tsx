/**
 * Landing — a STATIC, prerendered page (no providers, no auth, no socket).
 * The live board lives at /home. Everything here renders without a browser:
 * the hero graphic animates with CSS/SMIL only.
 */

import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FileLock2,
  Map as MapIcon,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react'
import { Seo } from '../components/Seo'
import { HeroMap } from '../components/HeroMap'
import { Logo, LogoMark } from '../components/Logo'
import { seo } from '../seo'

const FEATURES = [
  {
    icon: MapIcon,
    title: 'A live route map',
    body: 'Every open contract trip is drawn as a route on a world map. New postings appear for every pilot the moment they go live.',
  },
  {
    icon: BadgeCheck,
    title: 'Matched by type rating',
    body: 'Each trip states the type rating it needs. Pilots filter to the trips their ratings cover, and operators see the match at a glance.',
  },
  {
    icon: FileLock2,
    title: 'A private certificate vault',
    body: 'Pilots upload certificates, medicals and ratings once, then choose which documents to attach to each application.',
  },
  {
    icon: MessagesSquare,
    title: 'A thread per application',
    body: 'Each application has a private message thread between the pilot and the hiring operator, with status changes logged inline.',
  },
  {
    icon: CalendarClock,
    title: 'Interview booking',
    body: 'Operators publish open times and applicants book one. A slot can never be booked twice.',
  },
  {
    icon: ShieldCheck,
    title: 'Two roles, enforced',
    body: 'Operator and crew accounts get different permissions, checked on the server on every request.',
  },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        {/* Nav */}
        <header className="sticky top-0 z-20 border-b border-border/70 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link to="/"><Logo /></Link>
            <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#how" className="hover:text-foreground">How it works</a>
              <a href="#privacy" className="hover:text-foreground">Privacy</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/home" className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-foreground hover:bg-secondary sm:inline-flex">
                Browse trips
              </Link>
              <Link to="/profile" className="rounded-lg bg-[#0b1220] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#1b2436]">
                Get started
              </Link>
            </div>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className="relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_20%,rgba(37,99,235,0.12),transparent_70%),radial-gradient(40%_40%_at_10%_0%,rgba(11,18,32,0.05),transparent_70%)]" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1fr_1.15fr] lg:pt-24">
              <div className="rise-in">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Contract crew for private aviation
                </span>
                <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#0b1220] sm:text-6xl">
                  Find a type-rated pilot <span className="text-primary">before wheels-up.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Operators post contract trips with the route, aircraft, dates, day rate and required type rating.
                  Pilots see them on a live map, apply with their certificates and book the interview.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link to="/home" className="group inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(29,78,216,0.7)] hover:bg-[#1e40af]">
                    Open the live map <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link to="/profile" className="inline-flex items-center rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary">
                    Post a trip
                  </Link>
                </div>
                <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
                  {[
                    ['Live', 'route map'],
                    ['Private', 'documents'],
                    ['1-click', 'interviews'],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <dt className="text-lg font-semibold text-[#0b1220]">{a}</dt>
                      <dd className="text-xs text-muted-foreground">{b}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="rise-in" style={{ animationDelay: '0.15s' }}>
                <HeroMap />
              </div>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="border-t border-border bg-white py-24">
            <div className="mx-auto max-w-6xl px-6">
              <p className="text-sm font-semibold text-primary">Built for Part 91 and 135 crewing</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-[#0b1220] sm:text-4xl">
                From posting to crewed in one place.
              </h2>
              <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="bg-white p-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/15">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 font-semibold text-[#0b1220]">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how" className="py-24">
            <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-2">
              {[
                {
                  who: 'For operators',
                  steps: [
                    'Post a trip with its route, aircraft, dates, day rate and required rating.',
                    'Review applicants and open the certificates they attach.',
                    'Publish interview times, message candidates and hire.',
                  ],
                  cta: ['Post a trip', '/profile'],
                },
                {
                  who: 'For crew',
                  steps: [
                    'Upload your certificate, medical and type ratings once.',
                    'Filter the live map to trips your ratings cover.',
                    'Apply in a click, message the operator and book your interview.',
                  ],
                  cta: ['Find trips', '/home'],
                },
              ].map((col) => (
                <div key={col.who} className="rounded-2xl border border-border bg-white p-8">
                  <h3 className="text-xl font-semibold text-[#0b1220]">{col.who}</h3>
                  <ol className="mt-6 space-y-5">
                    {col.steps.map((s, i) => (
                      <li key={s} className="flex gap-4">
                        <span className="font-code flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b1220] text-xs text-white">{i + 1}</span>
                        <span className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <Link to={col.cta[1]} className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                    {col.cta[0]} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy band */}
          <section id="privacy" className="bg-[#0b1220] py-24 text-white">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
              <div>
                <FileLock2 className="h-8 w-8 text-[#93b4ff]" />
                <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Your documents stay yours.</h2>
                <p className="mt-4 max-w-lg leading-relaxed text-[#aab4c5]">
                  Certificates live in your private folder. When you apply, only the operator of that trip can open
                  the files you attach. Other pilots, other operators and the site's owner cannot. The server
                  enforces this on every request, not just the interface.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                {[
                  ['You', 'Full access', true],
                  ['Operator you applied to', 'Attached files only', true],
                  ['Other operators', 'No access', false],
                  ['Other pilots', 'No access', false],
                ].map(([who, what, ok]) => (
                  <div key={who as string} className="flex items-center justify-between border-b border-white/10 py-3.5 last:border-0">
                    <span className="text-sm">{who}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ok ? 'bg-[#2563eb]/20 text-[#93b4ff]' : 'bg-white/5 text-[#8b95a7]'}`}>{what}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Reviewer walkthrough */}
          <section id="try" className="border-t border-border bg-white py-24" data-testid="try-it">
            <div className="mx-auto max-w-6xl px-6">
              <p className="font-code text-xs uppercase tracking-[0.2em] text-primary">Try the full flow</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-[#0b1220] sm:text-4xl">Two demo accounts, five minutes.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Sign in with the email and password option, using one account per browser window (a normal and a private
                window works). The demo passwords are included with the project submission. Or sign in with your own
                Google account for one side to receive the real notification emails.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[
                  ['Operator', 'demo-operator@deepspace.test', 'Owns the "Reviewer demo — Teterboro to Aspen" trip, with interview slots already published.'],
                  ['Pilot', 'demo-pilot@deepspace.test', 'ATP, 6,200 hrs, G450 rated, with two sample certificates already uploaded.'],
                ].map(([who, email, body]) => (
                  <div key={who} className="rounded-2xl border border-border p-6">
                    <p className="text-sm font-semibold text-[#0b1220]">{who}</p>
                    <p className="font-code mt-1 break-all text-sm text-primary">{email}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                  </div>
                ))}
              </div>
              <ol className="mt-8 grid gap-x-8 gap-y-4 text-sm text-muted-foreground md:grid-cols-2">
                {[
                  ['Post a trip', 'As the operator, open Post a trip, pick a route, and press Draft with AI (Anthropic) to write the details.'],
                  ['Check the weather', 'Open any trip: live conditions at both airports come from OpenWeatherMap.'],
                  ['Apply', 'As the pilot, open the demo Aspen trip, attach a certificate and apply. The operator is emailed.'],
                  ['Book an interview', 'From the conversation, pick a slot, then Add interview to Google Calendar.'],
                  ['Hire', 'As the operator, press Hire. The pilot is emailed and can add the trip to Google Calendar.'],
                  ['Privacy check', 'Sign in as anyone else: the application and its certificates are not visible to them.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="font-code flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b1220] text-xs text-white">{i + 1}</span>
                    <span className="pt-0.5 leading-relaxed"><span className="font-medium text-[#0b1220]">{title}.</span> {body}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24">
            <div className="mx-auto max-w-6xl px-6">
              <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-white sm:px-16">
                <img src="/world-dots.svg" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen" />
                <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">Your next trip is already on the map.</h2>
                <p className="relative mx-auto mt-3 max-w-xl text-[#dbe6ff]">Browse open contracts without an account, or sign up in under a minute.</p>
                <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                  <Link to="/home" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-[#eef3fc]">Open the live map</Link>
                  <Link to="/profile" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Create an account</Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2"><LogoMark className="h-5 w-5" /> Charterline</span>
            <span>Charterline is a job board. Operators remain responsible for verifying certificates, currency and insurance before any flight.</span>
          </div>
        </footer>
      </div>
    </>
  )
}
