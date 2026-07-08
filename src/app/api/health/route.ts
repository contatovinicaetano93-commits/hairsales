import { ok, handleError } from '@/lib/api-response'
import { getHealthStatus } from '@/lib/health'

export async function GET() {
  try {
    return ok(await getHealthStatus())
  } catch (e) {
    return handleError(e)
  }
}
