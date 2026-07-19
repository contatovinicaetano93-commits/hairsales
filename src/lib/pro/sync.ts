import { getSql } from '@/lib/db'
import { guessServiceCategory } from '@/lib/avec/normalize'
import { getAgendaProvider } from '@/lib/providers/registry'
import { todayIso } from '@/lib/salon/format'
import {
  connectionProfessional,
  connectionToken,
  markConnectionSynced,
  type SubscriberConnectionRow,
} from '@/lib/pro/subscribers'
import { captureHairsalesException } from '@/lib/pro/observability'

async function upsertClient(
  subscriberId: string,
  input: {
    externalClientId: string | null
    name: string | null
    phone: string | null
    lastVisitAt: Date | null
    lastServiceName: string | null
    lastPrice: number | null
    status?: string
  },
): Promise<string | null> {
  const sql = getSql()

  if (input.externalClientId) {
    const existing = (await sql`
      select id from subscriber_clients
      where subscriber_id = ${subscriberId} and external_client_id = ${input.externalClientId}
      limit 1
    `) as { id: string }[]

    if (existing[0]) {
      await sql`
        update subscriber_clients set
          name = coalesce(${input.name}, name),
          phone = coalesce(${input.phone}, phone),
          last_visit_at = case
            when ${input.lastVisitAt?.toISOString() ?? null}::timestamptz is null then last_visit_at
            when last_visit_at is null then ${input.lastVisitAt?.toISOString() ?? null}::timestamptz
            when ${input.lastVisitAt?.toISOString() ?? null}::timestamptz > last_visit_at
              then ${input.lastVisitAt?.toISOString() ?? null}::timestamptz
            else last_visit_at
          end,
          last_service_name = coalesce(${input.lastServiceName}, last_service_name),
          last_price = coalesce(${input.lastPrice}, last_price),
          status = coalesce(${input.status ?? null}, status),
          updated_at = now()
        where id = ${existing[0].id}
      `
      return existing[0].id
    }
  }

  if (!input.externalClientId && !input.name && !input.phone) return null

  const rows = (await sql`
    insert into subscriber_clients (
      subscriber_id, external_client_id, name, phone, last_visit_at,
      last_service_name, last_price, status, updated_at
    ) values (
      ${subscriberId},
      ${input.externalClientId},
      ${input.name},
      ${input.phone},
      ${input.lastVisitAt?.toISOString() ?? null},
      ${input.lastServiceName},
      ${input.lastPrice},
      ${input.status ?? 'novo'},
      now()
    )
    returning id
  `) as { id: string }[]
  return rows[0]?.id ?? null
}

async function upsertService(
  subscriberId: string,
  clientId: string,
  name: string,
  lastDoneAt: Date | null,
  lastPrice: number | null,
) {
  const sql = getSql()
  const existing = (await sql`
    select id from subscriber_services
    where subscriber_id = ${subscriberId} and client_id = ${clientId}
      and lower(name) = lower(${name}) and active = true
    limit 1
  `) as { id: string }[]

  if (existing[0]) {
    await sql`
      update subscriber_services set
        last_done_at = case
          when ${lastDoneAt?.toISOString() ?? null}::timestamptz is null then last_done_at
          when last_done_at is null then ${lastDoneAt?.toISOString() ?? null}::timestamptz
          when ${lastDoneAt?.toISOString() ?? null}::timestamptz > last_done_at
            then ${lastDoneAt?.toISOString() ?? null}::timestamptz
          else last_done_at
        end,
        last_price = coalesce(${lastPrice}, last_price)
      where id = ${existing[0].id}
    `
    return
  }

  await sql`
    insert into subscriber_services (
      subscriber_id, client_id, name, category, cadence_days, last_done_at, last_price, active
    ) values (
      ${subscriberId},
      ${clientId},
      ${name},
      ${guessServiceCategory(name)},
      ${45},
      ${lastDoneAt?.toISOString() ?? null},
      ${lastPrice},
      true
    )
  `
}

export async function syncSubscriberConnection(conn: SubscriberConnectionRow) {
  try {
    const provider = getAgendaProvider(conn.provider)
    if (!provider.available) {
      throw new Error(`${provider.label} ainda não está disponível`)
    }

    const token = connectionToken(conn)
    const professional = connectionProfessional(conn)
    const unit = conn.unit_external_id

    const [revenue, appointments, attendances] = await Promise.all([
      provider.fetchRevenue({ token, professional, unitExternalId: unit, daysBack: 0 }),
      provider.fetchAppointments({
        token,
        professional,
        unitExternalId: unit,
        daysBack: 1,
        daysForward: 14,
      }),
      provider.fetchAttendances({ token, professional, unitExternalId: unit, daysBack: 90 }),
    ])

    const sql = getSql()
    const day = todayIso()
    const todaysAppts = appointments.filter(
      (a) => a.scheduledAt && a.scheduledAt.toISOString().slice(0, 10) === day,
    )

    await sql`
      insert into subscriber_metrics_daily (
        subscriber_id, day, revenue, attended, ticket_avg, occupancy, appointments, updated_at
      ) values (
        ${conn.subscriber_id},
        ${day},
        ${revenue?.revenue ?? 0},
        ${revenue?.attended ?? 0},
        ${revenue?.ticketAvg ?? null},
        ${revenue?.occupancy ?? null},
        ${todaysAppts.length},
        now()
      )
      on conflict (subscriber_id, day) do update set
        revenue = excluded.revenue,
        attended = excluded.attended,
        ticket_avg = excluded.ticket_avg,
        occupancy = excluded.occupancy,
        appointments = excluded.appointments,
        updated_at = now()
    `

    await sql`
      delete from subscriber_appointments
      where subscriber_id = ${conn.subscriber_id}
        and scheduled_at >= date_trunc('day', now())
    `

    for (const appt of appointments) {
      const clientId = await upsertClient(conn.subscriber_id, {
        externalClientId: appt.externalClientId,
        name: appt.clientName,
        phone: appt.clientPhone,
        lastVisitAt: null,
        lastServiceName: appt.serviceName,
        lastPrice: appt.price,
        status: 'agendado',
      })

      await sql`
        insert into subscriber_appointments (
          subscriber_id, client_id, external_client_id, client_name, service_name,
          scheduled_at, status, price, source, updated_at
        ) values (
          ${conn.subscriber_id},
          ${clientId},
          ${appt.externalClientId},
          ${appt.clientName},
          ${appt.serviceName},
          ${appt.scheduledAt?.toISOString() ?? null},
          ${appt.status},
          ${appt.price},
          ${conn.provider},
          now()
        )
      `
    }

    for (const att of attendances) {
      const clientId = await upsertClient(conn.subscriber_id, {
        externalClientId: att.externalClientId,
        name: att.clientName,
        phone: att.clientPhone,
        lastVisitAt: att.doneAt,
        lastServiceName: att.serviceName,
        lastPrice: att.price,
        status: 'convertido',
      })
      if (!clientId || !att.serviceName) continue
      await upsertService(conn.subscriber_id, clientId, att.serviceName, att.doneAt, att.price)
    }

    await markConnectionSynced(conn.id)

    return {
      revenue: revenue?.revenue ?? 0,
      attended: revenue?.attended ?? 0,
      appointments: appointments.length,
      attendances: attendances.length,
    }
  } catch (e) {
    captureHairsalesException(
      e,
      { id: conn.subscriber_id },
      {
        operation: 'syncSubscriberConnection',
        provider: conn.provider,
        connection_id: conn.id,
      },
    )
    throw e
  }
}
