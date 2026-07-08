import { NextRequest } from 'next/server'
import { ok, handleError } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth'
import { runSeed } from '@/lib/seed'

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    if (!auth.ok) return handleError(new Error(auth.message))

    const result = await runSeed()
    return ok(result)
  } catch (e) {
    return handleError(e)
  }
}
