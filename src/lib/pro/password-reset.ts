import { createHmac, timingSafeEqual } from 'crypto'
import { getProDataSecret } from '@/lib/pro/secrets'
import type { SubscriberRow } from '@/lib/pro/subscribers'

/**
 * Token de reset de senha assinado (mesmo padrão do token de sessão em
 * auth.ts) — sem precisar de tabela/coluna nova. Inclui um hash curto da
 * `password_hash` atual: assim que a senha muda, qualquer link antigo já
 * enviado por e-mail vira inválido automaticamente (link de uso único).
 */
const RESET_TOKEN_TTL_SECONDS = 60 * 60 // 1h

function secret() {
  return getProDataSecret()
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function passwordFingerprint(passwordHash: string): string {
  return createHmac('sha256', secret()).update(passwordHash).digest('base64url').slice(0, 16)
}

export function createPasswordResetToken(subscriber: Pick<SubscriberRow, 'id' | 'password_hash'>): string {
  const exp = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL_SECONDS
  const payload = Buffer.from(
    JSON.stringify({
      purpose: 'pwreset',
      sid: subscriber.id,
      pwv: passwordFingerprint(subscriber.password_hash),
      exp,
    }),
    'utf8',
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyPasswordResetToken(
  token: string,
  subscriber: Pick<SubscriberRow, 'id' | 'password_hash'>,
): boolean {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      purpose?: string
      sid?: string
      pwv?: string
      exp?: number
    }
    if (json.purpose !== 'pwreset') return false
    if (typeof json.exp !== 'number' || json.exp < Math.floor(Date.now() / 1000)) return false
    if (json.sid !== subscriber.id) return false
    if (json.pwv !== passwordFingerprint(subscriber.password_hash)) return false
    return true
  } catch {
    return false
  }
}

/** Extrai o subscriber id do token sem validar assinatura/senha — só pra buscar a linha antes de verificar de verdade. */
export function unsafePeekResetTokenSubscriberId(token: string): string | null {
  const [payload] = token.split('.')
  if (!payload) return null
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sid?: string }
    return typeof json.sid === 'string' ? json.sid : null
  } catch {
    return null
  }
}
