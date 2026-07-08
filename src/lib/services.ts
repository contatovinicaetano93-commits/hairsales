import { getSql } from '@/lib/db'

export const SERVICE_CATEGORIES = ['corte', 'tratamento', 'coloracao', 'bem_estar', 'produto', 'outro'] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export interface ClientService {
  id: string
  contact_id: string
  name: string
  category: string
  cadence_days: number | null
  last_done_at: string | null
  product: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export async function listServices(contactId: string): Promise<ClientService[]> {
  const sql = getSql()
  return (await sql`
    select * from client_services
    where contact_id = ${contactId} and active = true
    order by created_at asc
  `) as ClientService[]
}

interface AddServiceInput {
  name: string
  category: ServiceCategory
  cadenceDays?: number | null
  product?: string | null
  notes?: string | null
  lastDoneAt?: string | null
}

export async function addService(contactId: string, input: AddServiceInput): Promise<ClientService> {
  const sql = getSql()
  const rows = (await sql`
    insert into client_services (contact_id, name, category, cadence_days, product, notes, last_done_at)
    values (
      ${contactId},
      ${input.name},
      ${input.category},
      ${input.cadenceDays ?? null},
      ${input.product ?? null},
      ${input.notes ?? null},
      ${input.lastDoneAt ?? null}
    )
    returning *
  `) as ClientService[]
  return rows[0]
}

// Marca o serviço como realizado agora — reinicia o ciclo de recorrência.
export async function markServiceDone(serviceId: string): Promise<ClientService | null> {
  const sql = getSql()
  const rows = (await sql`
    update client_services set last_done_at = now()
    where id = ${serviceId}
    returning *
  `) as ClientService[]
  return rows[0] ?? null
}

export async function deactivateService(serviceId: string): Promise<ClientService | null> {
  const sql = getSql()
  const rows = (await sql`
    update client_services set active = false
    where id = ${serviceId}
    returning *
  `) as ClientService[]
  return rows[0] ?? null
}
