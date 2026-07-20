'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { OnboardingStatus } from '@/lib/pro/onboarding'
import { apiJson } from '@/lib/api-client'

export function OnboardingChecklist({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<OnboardingStatus | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    const res = await apiJson<OnboardingStatus>('/api/me/onboarding')
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setFailed(true)
      return
    }
    setData(res.data)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!data) {
    if (compact || !failed) return null
    return (
      <p className="text-xs font-medium text-muted">
        Não deu pra carregar o setup.{' '}
        <button type="button" onClick={() => void load()} className="text-gold-strong underline">
          Tentar de novo
        </button>
      </p>
    )
  }

  const pending = data.steps.filter((s) => !s.done)
  if (compact && data.ready_for_day && pending.length === 0) return null

  return (
    <section
      className={
        compact
          ? 'w-full rounded-3xl border border-border bg-surface/60 px-4 py-3'
          : 'w-full rounded-3xl border border-gold/25 bg-gold/5 px-5 py-4 sm:px-6'
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-bold">Setup</h3>
        <span className="text-xs text-muted">{data.percent}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${data.percent}%` }}
        />
      </div>
      {data.ai_tip && (
        <p className="mt-3 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-medium text-gold-strong">
          {data.ai_tip}
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {(compact ? pending.slice(0, 3) : data.steps).map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] ${
                step.done ? 'bg-success/20 text-success' : 'bg-border text-muted'
              }`}
            >
              {step.done ? '✓' : step.required ? '!' : '·'}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={step.href} className="font-medium hover:text-gold-strong">
                {step.title}
              </Link>
              <p className="text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {compact && pending.length > 3 && (
        <Link href="/pro/conectar" className="mt-2 inline-block text-xs text-gold-strong hover:underline">
          Ver todos os passos
        </Link>
      )}
    </section>
  )
}
