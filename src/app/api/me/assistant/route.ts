import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { askSubscriberAssistant, listAssistantHistory } from '@/lib/pro/assistant'
import { getQuotaStatus } from '@/lib/pro/quotas'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const history = await listAssistantHistory(auth.session.subscriber.id, 30)
    const quotas = await getQuotaStatus(auth.session.subscriber.id, auth.session.subscriber.plan)
    return ok({ history: history.reverse(), quotas })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const body = await req.json().catch(() => null)
    const question = typeof body?.message === 'string' ? body.message.trim() : ''
    if (question.length < 2) return err('Escreva sua pergunta', 400)

    const result = await askSubscriberAssistant(auth.session.subscriber, question)
    const quotas = await getQuotaStatus(auth.session.subscriber.id, auth.session.subscriber.plan)

    return ok({
      answer: result.answer,
      source: result.source,
      units: result.units,
      quota_error: result.quota_error ?? null,
      quotas,
    })
  } catch (e) {
    return handleError(e)
  }
}
