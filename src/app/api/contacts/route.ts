import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { upsertContact, logEvent } from '@/lib/contacts'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  notes: z.string().optional(),
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
      channel: 'manual',
      source: 'atendente',
    })

    await logEvent({
      contactId: contact.id,
      channel: 'manual',
      direction: 'in',
      handledBy: 'human',
      payload: { notes: payload.notes ?? null },
    })

    return ok(contact, undefined, 201)
  } catch (e) {
    return handleError(e)
  }
}
