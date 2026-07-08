import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth'
import { runSeed } from '@/lib/seed'

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.ROM_ACCESS_TOKEN) {
      return err('Configure ROM_ACCESS_TOKEN para usar seed em produção', 503)
    }

    const auth = requireAuth(req)
    if (!auth.ok) return handleError(new Error(auth.message))

    const result = await runSeed()
    return ok(result)
  } catch (e) {
    return handleError(e)
  }
}
