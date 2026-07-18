import { getSql } from '@/lib/db'
import { getActiveConnection, type SubscriberRow } from '@/lib/pro/subscribers'
import { todayIso } from '@/lib/salon/format'

export interface ProHojePayload {
  subscriber: {
    id: string
    display_name: string
    plan: string
  }
  connection: {
    status: 'active' | 'missing'
    provider: string | null
    professional_name: string | null
    last_sync_at: string | null
  }
  goals: {
    daily_revenue: number | null
    daily_progress_pct: number | null
  }
  metrics: {
    day: string
    revenue: number
    attended: number
    ticket_avg: number | null
    occupancy: number | null
    appointments: number
  }
  agenda: Array<{
    id: string
    client_name: string | null
    service_name: string | null
    scheduled_at: string | null
    status: string | null
    price: number | null
  }>
  leads_hot: number
  reactivation_count: number
  actions_top: Array<{
    kind: 'reactivation' | 'upsell'
    client_id: string
    client_name: string | null
    detail: string
  }>
}

export async function buildProHoje(subscriber: SubscriberRow): Promise<ProHojePayload> {
  const sql = getSql()
  const day = todayIso()
  const conn = await getActiveConnection(subscriber.id)

  const metricsRows = (await sql`
    select * from subscriber_metrics_daily
    where subscriber_id = ${subscriber.id} and day = ${day}
    limit 1
  `) as Array<{
    day: string
    revenue: number
    attended: number
    ticket_avg: number | null
    occupancy: number | null
    appointments: number
  }>

  const metrics = metricsRows[0] ?? {
    day,
    revenue: 0,
    attended: 0,
    ticket_avg: null,
    occupancy: null,
    appointments: 0,
  }

  const agenda = (await sql`
    select id, client_name, service_name, scheduled_at, status, price
    from subscriber_appointments
    where subscriber_id = ${subscriber.id}
      and scheduled_at >= date_trunc('day', now())
      and scheduled_at < date_trunc('day', now()) + interval '1 day'
    order by scheduled_at asc nulls last
    limit 30
  `) as ProHojePayload['agenda']

  const leads = (await sql`
    select count(*)::int as n from subscriber_clients
    where subscriber_id = ${subscriber.id}
      and status in ('novo', 'em_atendimento')
  `) as { n: number }[]

  const reactivation = (await sql`
    select id, name,
      coalesce(last_service_name, 'serviço') as last_service_name,
      last_visit_at
    from subscriber_clients
    where subscriber_id = ${subscriber.id}
      and last_visit_at is not null
      and last_visit_at < now() - interval '45 days'
    order by last_visit_at asc
    limit 20
  `) as Array<{ id: string; name: string | null; last_service_name: string; last_visit_at: string }>

  const upsell = (await sql`
    select c.id, c.name, s.name as service_name, s.last_done_at, s.cadence_days
    from subscriber_services s
    join subscriber_clients c on c.id = s.client_id
    where s.subscriber_id = ${subscriber.id}
      and s.active = true
      and s.last_done_at is not null
      and s.cadence_days is not null
      and s.last_done_at + (s.cadence_days || ' days')::interval <= now() + interval '7 days'
    order by s.last_done_at asc
    limit 10
  `) as Array<{
    id: string
    name: string | null
    service_name: string
    last_done_at: string
    cadence_days: number
  }>

  const actions_top: ProHojePayload['actions_top'] = []
  for (const r of reactivation.slice(0, 2)) {
    const days = Math.floor((Date.now() - new Date(r.last_visit_at).getTime()) / 86_400_000)
    actions_top.push({
      kind: 'reactivation',
      client_id: r.id,
      client_name: r.name,
      detail: `Sumiu há ${days} dias · ${r.last_service_name}`,
    })
  }
  for (const u of upsell.slice(0, 3 - actions_top.length)) {
    actions_top.push({
      kind: 'upsell',
      client_id: u.id,
      client_name: u.name,
      detail: `Sugerir retorno de ${u.service_name}`,
    })
  }

  const goal = subscriber.daily_goal_revenue != null ? Number(subscriber.daily_goal_revenue) : null
  const revenue = Number(metrics.revenue) || 0
  const progress =
    goal && goal > 0 ? Math.min(100, Math.round((revenue / goal) * 1000) / 10) : null

  return {
    subscriber: {
      id: subscriber.id,
      display_name: subscriber.display_name,
      plan: subscriber.plan,
    },
    connection: conn
      ? {
          status: 'active',
          provider: conn.provider,
          professional_name: conn.professional_name_matched,
          last_sync_at: conn.last_sync_at,
        }
      : { status: 'missing', provider: null, professional_name: null, last_sync_at: null },
    goals: {
      daily_revenue: goal,
      daily_progress_pct: progress,
    },
    metrics: {
      day: metrics.day,
      revenue,
      attended: Number(metrics.attended) || 0,
      ticket_avg: metrics.ticket_avg != null ? Number(metrics.ticket_avg) : null,
      occupancy: metrics.occupancy != null ? Number(metrics.occupancy) : null,
      appointments: Number(metrics.appointments) || agenda.length,
    },
    agenda,
    leads_hot: leads[0]?.n ?? 0,
    reactivation_count: reactivation.length,
    actions_top,
  }
}
