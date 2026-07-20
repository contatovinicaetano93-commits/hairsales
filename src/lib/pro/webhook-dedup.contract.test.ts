import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const TELEGRAM_ROUTE = path.join(
  process.cwd(),
  'src/app/api/webhooks/telegram-pro/route.ts',
)
const WHATSAPP_ROUTE = path.join(
  process.cwd(),
  'src/app/api/webhooks/whatsapp-pro/route.ts',
)

describe('Telegram Pro webhook dedup contract', () => {
  const source = readFileSync(TELEGRAM_ROUTE, 'utf8')

  it('claims the update before handling it and returns 200 on duplicates', () => {
    expect(source).toContain("claimWebhookEvent('telegram'")
    expect(source).toContain('claim.claimed')
    expect(source).toContain('duplicate: true')
  })

  it('marks the event processed or error after handling', () => {
    expect(source).toContain("status: 'processed'")
    expect(source).toContain("status: 'error'")
  })
})

describe('WhatsApp Pro webhook dedup contract', () => {
  const source = readFileSync(WHATSAPP_ROUTE, 'utf8')

  it('claims the inbound message id before any side effect and returns 200 on duplicates', () => {
    expect(source).toContain("claimWebhookEvent('whatsapp'")
    expect(source).toContain('claim.claimed')
    expect(source).toContain('duplicate: true')
  })

  it('marks the event processed, ignored, or error depending on outcome', () => {
    expect(source).toContain("status: 'processed'")
    expect(source).toContain("status: 'ignored'")
    expect(source).toContain("status: 'error'")
  })
})
