import { ok, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import type { ClientService } from '@/lib/services'
import { enrichServices, computeRecommendations } from '@/lib/recommendations'

interface JoinedService extends ClientService {
  contact_name: string | null
  contact_status: string
}

// GET /api/recommendations — visão do front: contatos com ação recomendada agora,
// ordenados por urgência (atrasados primeiro). Guia o cross-sell/up-sell proativo.
export async function GET() {
  try {
    const sql = getSql()
    const rows = (await sql`
      select cs.*, c.name as contact_name, c.status as contact_status
      from client_services cs
      join contacts c on c.id = cs.contact_id
      where cs.active = true
      order by cs.contact_id
    `) as JoinedService[]

    const byContact = new Map<string, JoinedService[]>()
    for (const r of rows) {
      const list = byContact.get(r.contact_id) ?? []
      list.push(r)
      byContact.set(r.contact_id, list)
    }

    const items = Array.from(byContact.entries())
      .map(([contactId, services]) => {
        const enriched = enrichServices(services)
        const recommendations = computeRecommendations(enriched)
        const overdue = enriched.filter((s) => s.state === 'overdue').length
        const dueSoon = enriched.filter((s) => s.state === 'due_soon').length
        return {
          contact_id: contactId,
          contact_name: services[0].contact_name,
          contact_status: services[0].contact_status,
          overdue,
          due_soon: dueSoon,
          recommendations,
        }
      })
      .filter((i) => i.recommendations.length > 0)
      .sort((a, b) => b.overdue - a.overdue || b.due_soon - a.due_soon)

    return ok(items)
  } catch (e) {
    return handleError(e)
  }
}
