import type { NextRequest } from 'next/server'
import { getSql } from '@/lib/db'

interface RateLimitOptions {
  route: string
  limit: number
  windowMs: number
}

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

// Fallback em memória — usado só se o Postgres estiver indisponível, pra não
// derrubar login/registro/checkout por causa do rate limit em si.
const memoryAttempts = new Map<string, number[]>()

function clientIp(req: Request | NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    forwarded ||
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

function evaluate(hits: number[], now: number, options: RateLimitOptions): RateLimitResult {
  if (hits.length > options.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((hits[0]! + options.windowMs - now) / 1000),
    )
    return { allowed: false, retryAfterSeconds }
  }
  return { allowed: true }
}

function memoryFallback(key: string, now: number, options: RateLimitOptions): RateLimitResult {
  const cutoff = now - options.windowMs
  const hits = (memoryAttempts.get(key) ?? []).filter((hit) => hit > cutoff)
  hits.push(now)
  memoryAttempts.set(key, hits)
  return evaluate(hits, now, options)
}

// Contador persistido no Neon (mesmo banco do Pro) — funciona entre
// instâncias serverless, ao contrário de um Map em memória. Cada chamada
// registra o hit atual e descarta hits fora da janela numa única query
// atômica (upsert).
export async function checkProRateLimit(
  req: Request | NextRequest,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = `${options.route}:${clientIp(req)}`
  const cutoff = now - options.windowMs

  try {
    const sql = getSql()
    const rows = await sql.query(
      `insert into pro_rate_limit_hits (key, hits, updated_at)
       values ($1, jsonb_build_array($2::bigint), now())
       on conflict (key) do update
       set hits = (
             select coalesce(jsonb_agg(h), '[]'::jsonb)
             from jsonb_array_elements_text(
               pro_rate_limit_hits.hits || jsonb_build_array($2::bigint)
             ) as h
             where h::bigint > $3::bigint
           ),
           updated_at = now()
       returning hits`,
      [key, now, cutoff],
    )
    const hits = ((rows[0]?.hits ?? []) as (string | number)[]).map(Number)
    return evaluate(hits, now, options)
  } catch {
    // Neon indisponível: degrada pro fallback em memória em vez de derrubar a rota.
    return memoryFallback(key, now, options)
  }
}

export function resetProRateLimitsForTests() {
  memoryAttempts.clear()
}
