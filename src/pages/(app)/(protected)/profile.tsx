/**
 * Onboarding + profile editing. The account type (operator / crew) is chosen
 * once; the schema marks it immutable, so the room refuses any later change.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutations, useUser } from 'deepspace'
import { Building2, Check, PlaneTakeoff } from 'lucide-react'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Field, NativeSelect, Panel } from '../../../components/bits'
import { useMyProfile } from '../../../lib/client'
import { AIRPORTS, TYPE_RATINGS } from '../../../lib/airports'
import { CERTIFICATES, type AccountType, type Profile } from '../../../schemas/aviation-schemas'

export default function ProfilePage() {
  const { profile, profileId, loading } = useMyProfile()
  const { user } = useUser()
  const navigate = useNavigate()
  const toast = useToast()
  const { ready, createConfirmed, putConfirmed } = useMutations<Profile>('profiles')

  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [form, setForm] = useState<Omit<Profile, 'accountType'>>({
    displayName: '',
    company: '',
    homeBase: '',
    certificate: '',
    totalHours: undefined,
    typeRatings: [],
    bio: '',
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile) {
      setAccountType(profile.accountType)
      setForm({
        displayName: profile.displayName ?? '',
        company: profile.company ?? '',
        homeBase: profile.homeBase ?? '',
        certificate: profile.certificate ?? '',
        totalHours: profile.totalHours,
        typeRatings: profile.typeRatings ?? [],
        bio: profile.bio ?? '',
      })
    } else if (user?.name) {
      setForm((f) => (f.displayName ? f : { ...f, displayName: user.name ?? '' }))
    }
  }, [profile, user?.name])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const isNew = !profile
  const isCrew = accountType === 'crew'

  async function save() {
    if (!accountType || !form.displayName.trim()) return
    setBusy(true)
    const payload = {
      ...form,
      displayName: form.displayName.trim(),
      totalHours: form.totalHours ? Number(form.totalHours) : undefined,
    }
    try {
      if (isNew) {
        await createConfirmed({ ...payload, accountType })
        toast.success('Welcome aboard', accountType === 'crew' ? 'Next: upload your certificates.' : 'Next: post your first trip.')
        navigate(accountType === 'crew' ? '/documents' : '/post')
      } else {
        await putConfirmed(profileId!, payload)
        toast.success('Profile saved')
      }
    } catch (e) {
      toast.error('Could not save profile', e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{isNew ? 'Set up your account' : 'Your profile'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isNew
          ? 'Choose how you use Charterline. This choice is permanent for this account.'
          : 'Operators see this when you apply. Your documents stay private until you attach them to an application.'}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(
          [
            { id: 'crew', icon: PlaneTakeoff, title: 'I fly', body: 'Find contract trips that match your type ratings and apply with your certificates.' },
            { id: 'operator', icon: Building2, title: 'I hire crew', body: 'Post contract trips on the live map and review applicants.' },
          ] as const
        ).map((opt) => {
          const active = accountType === opt.id
          const locked = !isNew && !active
          return (
            <button
              key={opt.id}
              disabled={!isNew}
              onClick={() => setAccountType(opt.id)}
              data-testid={`role-${opt.id}`}
              className={cn(
                'relative rounded-lg border p-4 text-left transition-colors',
                active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted-foreground/40',
                locked && 'opacity-40',
                !isNew && 'cursor-default',
              )}
            >
              {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
              <opt.icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <p className="mt-3 text-sm font-semibold">{opt.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opt.body}</p>
            </button>
          )
        })}
      </div>

      {accountType && (
        <Panel className="mt-6 space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isCrew ? 'Full name' : 'Your name'}>
              <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} data-testid="profile-name" />
            </Field>
            {!isCrew && (
              <Field label="Operator / company">
                <Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="e.g. Skyline Charter Group" data-testid="profile-company" />
              </Field>
            )}
            <Field label="Home base">
              <NativeSelect value={form.homeBase} onChange={(e) => set('homeBase', e.target.value)}>
                <option value="">—</option>
                {AIRPORTS.map((a) => (
                  <option key={a.icao} value={a.icao}>{a.icao} · {a.city}</option>
                ))}
              </NativeSelect>
            </Field>
            {isCrew && (
              <>
                <Field label="Highest certificate">
                  <NativeSelect value={form.certificate} onChange={(e) => set('certificate', e.target.value)}>
                    <option value="">—</option>
                    {CERTIFICATES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Total time (hrs)">
                  <Input
                    type="number"
                    min={0}
                    value={form.totalHours ?? ''}
                    onChange={(e) => set('totalHours', e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </Field>
              </>
            )}
          </div>

          {isCrew && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type ratings</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_RATINGS.map((r) => {
                  const on = form.typeRatings?.includes(r)
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        set('typeRatings', on ? form.typeRatings!.filter((x) => x !== r) : [...(form.typeRatings ?? []), r])
                      }
                      className={cn(
                        'rounded border px-2 py-1 text-xs transition-colors',
                        on ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="font-code">{r.split(' (')[0]}</span>
                      <span className="ml-1 opacity-70">{r.split(' (')[1]?.replace(')', '')}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Field label={isCrew ? 'About you' : 'About the operation'}>
            <Textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder={isCrew ? 'Recent flying, Part 135 experience, international ops…' : 'Fleet, certificate (Part 91/135), typical missions…'}
            />
          </Field>

          <div className="flex justify-end">
            <Button onClick={save} loading={busy} disabled={!ready || !form.displayName.trim()} data-testid="profile-save">
              {isNew ? 'Create account' : 'Save changes'}
            </Button>
          </div>
        </Panel>
      )}
    </div>
  )
}
