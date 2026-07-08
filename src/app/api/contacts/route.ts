import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { upsertContact, logEvent, updateContact } from '@/lib/contacts'
import { addService } from '@/lib/services'
import { SERVICE_CATEGORIES } from '@/lib/services'

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(SERVICE_CATEGORIES),
  cadenceDays: z.number().int().positive().optional(),
  product: z.string().optional(),
  notes: z.string().optional(),
})

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  services: z.array(serviceSchema).optional(),
})

export async function GET() {
  try {
    const sql = getSql()
    const data = await sql`
      select * from contacts order by created_at desc limit 50
    `
    return ok(data)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const payload = schema.parse(body)

    const contact = await upsertContact({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      channel: 'manual',
      source: 'atendente',
    })

    // e-mail/notas podem chegar mesmo quando o telefone já existia (upsert) — garante persistência.
    if (payload.email || payload.notes) {
      await updateContact(contact.id, { email: payload.email, notes: payload.notes })
    }

    for (const s of payload.services ?? []) {
      await addService(contact.id, {
        name: s.name,
        category: s.category,
        cadenceDays: s.cadenceDays,
        product: s.product,
        notes: s.notes,
      })
    }

    await logEvent({
      contactId: contact.id,
      channel: 'manual',
      direction: 'in',
      handledBy: 'human',
      payload: { notes: payload.notes ?? null, services: payload.services?.length ?? 0 },
    })

    return ok(contact, undefined, 201)
  } catch (e) {
    return handleError(e)
  }
}
