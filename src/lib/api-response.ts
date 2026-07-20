import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { EntitlementError } from '@/lib/pro/entitlements'
import { Observability } from '@/lib/observability'

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ data, meta: meta ?? null }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return err(e.issues.map((i) => i.message).join(', '), 422)
  }
  if (e instanceof EntitlementError) {
    return err(e.message, 403)
  }
  if (e instanceof Error) {
    Observability.captureException(e)
    return err('Erro interno. Tente novamente em instantes.', 500)
  }
  Observability.captureException(new Error(String(e)))
  return err('Erro interno. Tente novamente em instantes.', 500)
}
