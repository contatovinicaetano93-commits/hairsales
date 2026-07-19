import type { NextRequest } from 'next/server'

interface RateLimitOptions {
  route: string
  limit: number
  windowMs: number
}

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

const attempts = new Map<string, number[]>()
let lastCleanup = 0

function clientIp(req: Request | NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    forwarded ||
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

function cleanup(now: number, windowMs: number) {
  if (now - lastCleanup < windowMs) return
  lastCleanup = now
  for (const [key, hits] of attempts) {
    const active = hits.filter((hit) => hit > now - windowMs)
    if (active.length === 0) attempts.delete(key)
    else attempts.set(key, active)
  }
}

// In-memory limits are ephemeral on serverless; good enough until Redis-backed limits land.
export function checkProRateLimit(
  req: Request | NextRequest,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now()
  cleanup(now, options.windowMs)

  const key = `${options.route}:${clientIp(req)}`
  const cutoff = now - options.windowMs
  const hits = (attempts.get(key) ?? []).filter((hit) => hit > cutoff)

  if (hits.length >= options.limit) {
    attempts.set(key, hits)
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0]! + options.windowMs - now) / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  hits.push(now)
  attempts.set(key, hits)
  return { allowed: true }
}

export function resetProRateLimitsForTests() {
  attempts.clear()
  lastCleanup = 0
}
