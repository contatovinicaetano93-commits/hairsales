import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, handleError } from '@/lib/api-response'
import { markServiceDone, deactivateService } from '@/lib/services'

type Ctx = { params: Promise<{ id: string }> }

const schema = z.object({
  action: z.enum(['done', 'deactivate']),
})

// PATCH /api/services/[id] — fluxo guiado de recorrência:
// action=done reinicia o ciclo; action=deactivate arquiva o serviço.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const { action } = schema.parse(await req.json())

    const service = action === 'done' ? await markServiceDone(id) : await deactivateService(id)
    if (!service) return err('Serviço não encontrado', 404)

    return ok(service)
  } catch (e) {
    return handleError(e)
  }
}
