import { getSql } from '@/lib/db'

type Channel = 'whatsapp' | 'telegram' | 'avec' | 'instagram' | 'manual'

interface UpsertContactInput {
  phone?: string | null
  name?: string | null
  channel: Channel
  source: string
  avecClientId?: string | null
}

export interface ContactRow {
  id: string
  name: string | null
  phone: string | null
  channel: string
  source: string
  status: string
  avec_client_id: string | null
  notes: string | null
  first_contact_at: string
  last_contact_at: string
  created_at: string
}

// Fluxo guiado: todo contato novo entra como "novo", sobe pro mesmo registro
// se o telefone já existir (evita duplicar KPI de canais diferentes falando
// com a mesma pessoa).
export async function upsertContact(input: UpsertContactInput): Promise<ContactRow> {
  const sql = getSql()

  if (input.phone) {
    const existing = (await sql`
      select id from contacts where phone = ${input.phone} limit 1
    `) as { id: string }[]

    if (existing.length > 0) {
      const rows = (await sql`
        update contacts
        set last_contact_at = now(),
            name = coalesce(${input.name ?? null}, name)
        where id = ${existing[0].id}
        returning *
      `) as ContactRow[]
      return rows[0]
    }
  }

  const rows = (await sql`
    insert into contacts (name, phone, channel, source, avec_client_id)
    values (
      ${input.name ?? null},
      ${input.phone ?? null},
      ${input.channel},
      ${input.source},
      ${input.avecClientId ?? null}
    )
    returning *
  `) as ContactRow[]

  return rows[0]
}

interface LogEventInput {
  contactId: string | null
  channel: Channel
  direction: 'in' | 'out'
  handledBy: 'ai' | 'human' | 'system'
  payload: Record<string, unknown>
  error?: string | null
}

// Resiliente por design: erro na IA/API externa nunca derruba o webhook —
// fica registrado aqui com o campo `error` pra reprocessar ou investigar depois.
export async function logEvent(input: LogEventInput) {
  const sql = getSql()
  await sql`
    insert into contact_events (contact_id, channel, direction, handled_by, payload, error)
    values (
      ${input.contactId},
      ${input.channel},
      ${input.direction},
      ${input.handledBy},
      ${JSON.stringify(input.payload)}::jsonb,
      ${input.error ?? null}
    )
  `
}
