import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { assertCan } from '@/lib/pro/entitlements'
import { getAgendaProvider, listAgendaProviders } from '@/lib/providers/registry'
import type { AgendaProviderId } from '@/lib/providers/types'
import {
  markConnectionError,
  updateSubscriberDisplayName,
  upsertConnection,
  type SubscriberRow,
} from '@/lib/pro/subscribers'
import { syncSubscriberConnection } from '@/lib/pro/sync'
import { captureHairsalesException } from '@/lib/pro/observability'

export async function GET() {
  return ok({
    providers: listAgendaProviders().map((p) => ({
      id: p.id,
      label: p.label,
      available: p.available,
    })),
  })
}

export async function POST(req: NextRequest) {
  let subscriber: SubscriberRow | null = null
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    subscriber = auth.session.subscriber
    assertCan(subscriber, 'agenda_sync')

    const body = await req.json().catch(() => null)
    const providerId = (typeof body?.provider === 'string' ? body.provider : 'avec') as AgendaProviderId
    const displayName =
      typeof body?.display_name === 'string' ? body.display_name.trim() : subscriber.display_name
    const apiToken = typeof body?.api_token === 'string' ? body.api_token.trim() : ''
    const unitExternalId =
      typeof body?.unit_external_id === 'string' ? body.unit_external_id.trim() : null

    if (displayName.length < 2) return err('Informe o nome exatamente como no Avec/Trinks', 400)
    if (!apiToken) return err('Cole o token da API da agenda', 400)

    const provider = getAgendaProvider(providerId)
    if (!provider.available) {
      return err(`${provider.label} em breve — use Avec por enquanto`, 400)
    }

    await updateSubscriberDisplayName(subscriber.id, displayName)

    const resolved = await provider.resolveProfessional({
      token: apiToken,
      displayName,
      unitExternalId,
    })

    if (resolved.status === 'not_found') {
      await markConnectionError(
        subscriber.id,
        providerId,
        'Nome não encontrado na agenda',
      ).catch(() => {})
      return err(
        'Não achei esse nome na agenda. Confira como está cadastrado no Avec/Trinks e tente de novo.',
        404,
      )
    }

    if (resolved.status === 'ambiguous') {
      return err(
        `Encontrei mais de um nome parecido (${resolved.candidates.join(', ')}). Digite o nome completo igual ao da agenda.`,
        409,
      )
    }

    const conn = await upsertConnection({
      subscriberId: subscriber.id,
      provider: providerId,
      apiToken,
      unitExternalId,
      professionalExternalId: resolved.externalId,
      professionalNameMatched: resolved.canonicalName,
      nameAliases: resolved.aliases,
      status: 'active',
    })

    const syncStats = await syncSubscriberConnection(conn)
    console.info(
      JSON.stringify({
        event: 'hairsales.agenda_connected',
        surface: 'hairsales',
        subscriber_id: subscriber.id,
        plan: subscriber.plan,
        subscription_status: subscriber.subscription_status,
        provider: providerId,
        appointments: syncStats.appointments,
        attendances: syncStats.attendances,
      }),
    )

    return ok({
      connection: {
        provider: conn.provider,
        status: 'active',
        professional_name: resolved.canonicalName,
        professional_external_id: resolved.externalId,
      },
      sync: syncStats,
    })
  } catch (e) {
    captureHairsalesException(e, subscriber, {
      route: '/api/me/connect',
      method: 'POST',
    })
    return handleError(e)
  }
}
