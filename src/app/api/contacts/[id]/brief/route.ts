import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getContactById, logEvent } from '@/lib/contacts'
import { listServices } from '@/lib/services'
import { enrichServices, computeRecommendations } from '@/lib/recommendations'
import { generateBrief } from '@/lib/brief'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/contacts/[id]/brief — briefing pro backstaff (IA + fallback por regras).
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const contact = await getContactById(id)
    if (!contact) return err('Contato não encontrado', 404)

    const services = enrichServices(await listServices(id))
    const recommendations = computeRecommendations(services)
    const { brief, source } = await generateBrief(contact, services, recommendations)

    // Registra o briefing gerado — rastreável e reprocessável.
    await logEvent({
      contactId: id,
      channel: 'manual',
      direction: 'out',
      handledBy: source === 'ai' ? 'ai' : 'system',
      payload: { brief, source },
    }).catch(() => {})

    return ok({ brief, source, recommendations })
  } catch (e) {
    return handleError(e)
  }
}
