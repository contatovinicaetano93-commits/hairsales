import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { verifyMetaWebhookSignature } from './whatsapp-signature'

function signature(rawBody: Buffer, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
}

describe('verifyMetaWebhookSignature', () => {
  it('accepts a valid Meta sha256 signature', () => {
    const rawBody = Buffer.from(JSON.stringify({ entry: [] }))
    expect(verifyMetaWebhookSignature(rawBody, signature(rawBody, 'app-secret'), 'app-secret')).toBe(true)
  })

  it('rejects missing, malformed, or mismatched signatures', () => {
    const rawBody = Buffer.from(JSON.stringify({ entry: [] }))
    const tamperedBody = Buffer.from(JSON.stringify({ entry: [{ id: 'changed' }] }))

    expect(verifyMetaWebhookSignature(rawBody, null, 'app-secret')).toBe(false)
    expect(verifyMetaWebhookSignature(rawBody, 'sha1=abc', 'app-secret')).toBe(false)
    expect(verifyMetaWebhookSignature(rawBody, 'sha256=not-hex', 'app-secret')).toBe(false)
    expect(verifyMetaWebhookSignature(rawBody, 'sha256=abcd', 'app-secret')).toBe(false)
    expect(verifyMetaWebhookSignature(tamperedBody, signature(rawBody, 'app-secret'), 'app-secret')).toBe(
      false,
    )
    expect(verifyMetaWebhookSignature(rawBody, signature(rawBody, 'wrong-secret'), 'app-secret')).toBe(false)
  })
})
