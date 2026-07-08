import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, handleError } from '@/lib/api-response'
import { getContactById, updateContact, logEvent, listEvents, CONTACT_STATUSES } from '@/lib/contacts'
import { listServices, autoCompleteServicesOnConversion } from '@/lib/services'
import { enrichServices, computeRecommendations } from '@/lib/recommendations'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const contact = await getContactById(id)
    if (!contact) return err('Contato não encontrado', 404)

    const services = enrichServices(await listServices(id))
    const recommendations = computeRecommendations(services)
    const events = await listEvents(id)

    return ok({ contact, services, recommendations, events })
  } catch (e) {
    return handleError(e)
  }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  phone: z.string().min(8).optional(),
  status: z.enum(CONTACT_STATUSES).optional(),
  notes: z.string().optional(),
})

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const patch = patchSchema.parse(await req.json())

    const before = await getContactById(id)
    if (!before) return err('Contato não encontrado', 404)

    const updated = await updateContact(id, patch)
    if (!updated) return err('Contato não encontrado', 404)

    let autoDone: string[] = []
    if (patch.status === 'convertido' && before.status !== 'convertido') {
      autoDone = await autoCompleteServicesOnConversion(id)
    }

    await logEvent({
      contactId: id,
      channel: 'manual',
      direction: 'in',
      handledBy: 'human',
      payload: {
        update: patch,
        ...(autoDone.length > 0 ? { conversion_auto_done: autoDone } : {}),
      },
    })

    return ok({ ...updated, auto_completed_services: autoDone })
  } catch (e) {
    return handleError(e)
  }
}
