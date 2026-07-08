import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, handleError } from '@/lib/api-response'
import { getContactById, updateContact, logEvent, CONTACT_STATUSES } from '@/lib/contacts'
import { listServices } from '@/lib/services'
import { enrichServices, computeRecommendations } from '@/lib/recommendations'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const contact = await getContactById(id)
    if (!contact) return err('Contato não encontrado', 404)

    const services = enrichServices(await listServices(id))
    const recommendations = computeRecommendations(services)

    return ok({ contact, services, recommendations })
  } catch (e) {
    return handleError(e)
  }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  status: z.enum(CONTACT_STATUSES).optional(),
  notes: z.string().optional(),
})

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const patch = patchSchema.parse(await req.json())

    const updated = await updateContact(id, patch)
    if (!updated) return err('Contato não encontrado', 404)

    await logEvent({
      contactId: id,
      channel: 'manual',
      direction: 'in',
      handledBy: 'human',
      payload: { update: patch },
    })

    return ok(updated)
  } catch (e) {
    return handleError(e)
  }
}
