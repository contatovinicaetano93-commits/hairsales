import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { requireProSession } from '@/lib/pro/auth'
import {
  sendAppointmentReminder,
  sendReactivationMessage,
  WhatsappPlanError,
  WhatsappQuotaError,
} from '@/lib/pro/whatsapp-cloud'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const body = await req.json().catch(() => null)
    const kind = typeof body?.kind === 'string' ? body.kind : ''
    const clientId = typeof body?.client_id === 'string' ? body.client_id : ''

    if (!clientId) return err('Cliente não informado', 400)
    if (kind !== 'reminder' && kind !== 'reactivation') {
      return err('kind deve ser reminder ou reactivation', 400)
    }

    const sql = getSql()
    const clients = (await sql`
      select id, name, phone, last_service_name
      from subscriber_clients
      where id = ${clientId} and subscriber_id = ${auth.session.subscriber.id}
      limit 1
    `) as Array<{
      id: string
      name: string | null
      phone: string | null
      last_service_name: string | null
    }>

    const client = clients[0]
    if (!client) return err('Cliente não encontrado na sua lista', 404)
    if (!client.phone) return err('Cliente sem telefone', 400)

    if (kind === 'reminder') {
      const appts = (await sql`
        select service_name, scheduled_at
        from subscriber_appointments
        where subscriber_id = ${auth.session.subscriber.id}
          and client_id = ${clientId}
          and scheduled_at >= now()
        order by scheduled_at asc
        limit 1
      `) as Array<{ service_name: string | null; scheduled_at: string | null }>

      const appt = appts[0]
      const whenLabel = appt?.scheduled_at
        ? new Date(appt.scheduled_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'em breve'
      const result = await sendAppointmentReminder({
        subscriber: auth.session.subscriber,
        clientId: client.id,
        toPhone: client.phone,
        clientName: client.name ?? 'Cliente',
        serviceName: appt?.service_name ?? client.last_service_name ?? 'atendimento',
        whenLabel,
      })
      return ok({ sent: true, ...result })
    }

    const result = await sendReactivationMessage({
      subscriber: auth.session.subscriber,
      clientId: client.id,
      toPhone: client.phone,
      clientName: client.name ?? 'Cliente',
    })
    return ok({ sent: true, ...result })
  } catch (e) {
    if (e instanceof WhatsappPlanError) return err(e.message, 403)
    if (e instanceof WhatsappQuotaError) return err(e.message, 402)
    return handleError(e)
  }
}
