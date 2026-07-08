import { getSql } from '@/lib/db'
import type { ContactRow } from '@/lib/contacts'
import type { ClientService } from '@/lib/services'
import { enrichServices, computeRecommendations } from '@/lib/recommendations'

const DAY = 86_400_000

export interface ContactListItem extends ContactRow {
  overdue: number
  due_soon: number
  scheduled_soon: number
  pending_actions: number
  urgency_score: number
  top_action: string | null
}

function urgencyForContact(services: ClientService[]) {
  const enriched = enrichServices(services)
  const recommendations = computeRecommendations(enriched)
  const now = Date.now()

  const overdue = enriched.filter((s) => s.state === 'overdue').length
  const due_soon = enriched.filter((s) => s.state === 'due_soon').length
  const scheduled_soon = enriched.filter((s) => {
    if (!s.scheduled_at) return false
    const t = new Date(s.scheduled_at).getTime()
    return t >= now && t - now <= 7 * DAY
  }).length
  const scheduled_today = enriched.filter((s) => {
    if (!s.scheduled_at) return false
    const d = new Date(s.scheduled_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  const urgentRecs = recommendations.filter((r) =>
    ['overdue', 'due_soon', 'scheduled'].includes(r.type)
  )
  const pending_actions =
    overdue + due_soon + scheduled_soon > 0 ? overdue + due_soon + scheduled_soon : recommendations.length

  const urgency_score =
    overdue * 1000 + due_soon * 100 + scheduled_today * 50 + scheduled_soon * 10

  const top = urgentRecs[0] ?? recommendations[0]

  return {
    overdue,
    due_soon,
    scheduled_soon,
    pending_actions,
    urgency_score,
    top_action: top ? top.title : null,
  }
}

// Lista contatos com resumo de urgência — base do filtro "só pendentes" e ordenação.
export async function listContactsWithSummary(limit = 100): Promise<ContactListItem[]> {
  const sql = getSql()
  const contacts = (await sql`
    select * from contacts order by created_at desc limit ${limit}
  `) as ContactRow[]

  if (contacts.length === 0) return []

  const services = (await sql`
    select * from client_services where active = true
  `) as ClientService[]

  const byContact = new Map<string, ClientService[]>()
  for (const s of services) {
    const list = byContact.get(s.contact_id) ?? []
    list.push(s)
    byContact.set(s.contact_id, list)
  }

  return contacts.map((c) => {
    const u = urgencyForContact(byContact.get(c.id) ?? [])
    return { ...c, ...u }
  })
}
