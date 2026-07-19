import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { askSubscriberAssistant, listAssistantHistory } from '@/lib/pro/assistant'
import { getQuotaStatus } from '@/lib/pro/quotas'
import { captureHairsalesException } from '@/lib/pro/observability'
import type { SubscriberRow } from '@/lib/pro/subscribers'

export async function GET(req: NextRequest) {
  let subscriber: SubscriberRow | null = null
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    subscriber = auth.session.subscriber
    const history = await listAssistantHistory(subscriber.id, 30)
    const quotas = await getQuotaStatus(subscriber.id, subscriber.plan)
    return ok({ history: history.reverse(), quotas })
  } catch (e) {
    captureHairsalesException(e, subscriber, {
      route: '/api/me/assistant',
      method: 'GET',
    })
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  let subscriber: SubscriberRow | null = null
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    subscriber = auth.session.subscriber

    const body = await req.json().catch(() => null)
    const question = typeof body?.message === 'string' ? body.message.trim() : ''
    if (question.length < 2) return err('Escreva sua pergunta', 400)

    const result = await askSubscriberAssistant(subscriber, question)
    const quotas = await getQuotaStatus(subscriber.id, subscriber.plan)

    return ok({
      answer: result.answer,
      source: result.source,
      units: result.units,
      quota_error: result.quota_error ?? null,
      quotas,
    })
  } catch (e) {
    captureHairsalesException(e, subscriber, {
      route: '/api/me/assistant',
      method: 'POST',
    })
    return handleError(e)
  }
}
