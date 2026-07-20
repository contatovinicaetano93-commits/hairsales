import { getSql } from '@/lib/db'
import { findSubscriberById } from '@/lib/pro/subscribers'
import {
  getSubscriberWhatsapp,
  sendAppointmentReminder,
} from '@/lib/pro/whatsapp-cloud'
import { can } from '@/lib/pro/entitlements'

/**
 * Envia lembretes utility para agendamentos nas próximas `hoursAhead` horas
 * que ainda não receberam reminder — só assinantes Pro com WA ativo.
 */
export async function runProAppointmentReminders(hoursAhead = 24): Promise<{
  scanned: number
  sent: number
  skipped: number
  errors: string[]
}> {
  const sql = getSql()
  const rows = (await sql`
    select a.id as appointment_id, a.subscriber_id, a.client_id, a.client_name,
           a.service_name, a.scheduled_at, c.phone
    from subscriber_appointments a
    left join subscriber_clients c on c.id = a.client_id
    join subscribers s on s.id = a.subscriber_id
    join subscriber_whatsapp w on w.subscriber_id = a.subscriber_id and w.status = 'active'
    where s.plan = 'pro'
      and s.subscription_status = 'active'
      and a.reminder_sent_at is null
      and a.scheduled_at is not null
      and a.scheduled_at > now()
      and a.scheduled_at <= now() + (${hoursAhead}::int || ' hours')::interval
      and coalesce(c.phone, '') <> ''
    order by a.scheduled_at asc
    limit 100
  `) as Array<{
    appointment_id: string
    subscriber_id: string
    client_id: string | null
    client_name: string | null
    service_name: string | null
    scheduled_at: string
    phone: string | null
  }>

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  await Promise.allSettled(
    rows.map(async (row) => {
      try {
        const subscriber = await findSubscriberById(row.subscriber_id)
        if (!subscriber || !can(subscriber, 'whatsapp_cloud')) {
          skipped++
          return
        }
        const wa = await getSubscriberWhatsapp(subscriber.id)
        if (!wa || wa.status !== 'active') {
          skipped++
          return
        }
        if (!row.phone || !row.client_id) {
          skipped++
          return
        }

        const whenLabel = new Date(row.scheduled_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendAppointmentReminder({
          subscriber,
          clientId: row.client_id,
          toPhone: row.phone,
          clientName: row.client_name ?? 'Cliente',
          serviceName: row.service_name ?? 'atendimento',
          whenLabel,
        })

        await sql`
          update subscriber_appointments
          set reminder_sent_at = now(), updated_at = now()
          where id = ${row.appointment_id}
        `
        sent++
      } catch (e) {
        errors.push(
          `${row.appointment_id}: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }),
  )

  return { scanned: rows.length, sent, skipped, errors }
}
