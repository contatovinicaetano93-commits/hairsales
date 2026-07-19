/**
 * Criptografia de tokens de agenda (Avec/Trinks) por assinante.
 * AES-256-GCM com chave derivada de PRO_DATA_SECRET (ou fallback de dev).
 */

import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  pbkdf2 as nodePbkdf2,
} from 'crypto'
import { promisify } from 'util'
import { getProDataSecret } from '@/lib/pro/secrets'

const ALGO = 'aes-256-gcm'
const pbkdf2Async = promisify(nodePbkdf2)

function getSecret() {
  return getProDataSecret()
}

function deriveKey(): Buffer {
  return scryptSync(getSecret(), 'vitrini-pro-token-v1', 32)
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, deriveKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(':')
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Token criptografado inválido')
  }
  const decipher = createDecipheriv(ALGO, deriveKey(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ])
  return dec.toString('utf8')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = (await pbkdf2Async(password, salt, 120_000, 32, 'sha256')) as Buffer
  return `pbkdf2:${salt.toString('base64url')}:${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split(':')
  if (algo !== 'pbkdf2' || !saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, 'base64url')
  const expected = Buffer.from(hashB64, 'base64url')
  const actual = (await pbkdf2Async(password, salt, 120_000, 32, 'sha256')) as Buffer
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a[i]! ^ b[i]!
  return out === 0
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex')
}
