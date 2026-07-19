import { NextRequest, NextResponse } from 'next/server'
import { err } from '@/lib/api-response'
import { requireSession } from '@/lib/auth'
import { openAPISpec } from '@/lib/openapi'

export async function GET(req: NextRequest) {
  const auth = await requireSession(req)
  if (!auth.ok) return err(auth.message, auth.status)

  return NextResponse.json(openAPISpec, {
    headers: { 'Content-Type': 'application/json' },
  })
}
