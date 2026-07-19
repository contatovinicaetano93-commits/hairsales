import { createHmac, timingSafeEqual } from 'crypto'

const META_SIGNATURE_PREFIX = 'sha256='
const SHA256_HEX_LENGTH = 64

export function verifyMetaWebhookSignature(rawBody: Buffer, signature: string | null, appSecret: string) {
  const value = signature?.trim()
  if (!value?.startsWith(META_SIGNATURE_PREFIX)) return false

  const hex = value.slice(META_SIGNATURE_PREFIX.length)
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false

  const received = Buffer.from(hex, 'hex')
  if (received.length !== SHA256_HEX_LENGTH / 2) return false

  const expected = createHmac('sha256', appSecret).update(rawBody).digest()
  return received.length === expected.length && timingSafeEqual(received, expected)
}
