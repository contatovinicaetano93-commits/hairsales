'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Boundary de erro do app Pro — ao contrário do global-error.tsx (que substitui
// html/body inteiro), este fica dentro do layout e mantém a sidebar/nav
// visíveis, então o profissional nunca perde o caminho de volta pro app.
export default function ProError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl border border-border bg-card px-5 py-6">
      <h2 className="font-serif text-xl font-bold text-foreground">Algo deu errado</h2>
      <p className="text-sm font-medium text-muted">
        Não conseguimos carregar essa tela agora. Tente de novo — se continuar, a equipe já foi
        avisada.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[#1a1714]"
      >
        Tentar de novo
      </button>
    </div>
  )
}
