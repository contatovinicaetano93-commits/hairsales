import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProSessionToken, parseProSessionToken } from './auth'
import {
  getProDataSecret,
  getTelegramProBotToken,
  getTelegramProWebhookSecret,
  getWhatsAppProAppSecret,
  getWhatsAppProVerifyToken,
} from './secrets'

function signedPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

describe('Pro secrets', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('does not fall back to CRON_SECRET for session signing', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', '')
    vi.stubEnv('CRON_SECRET', 'cron-secret')

    const token = createProSessionToken('sub_123', 1)
    const [payload, signature] = token.split('.')

    expect(payload).toBeTruthy()
    expect(signature).toBeTruthy()
    expect(signature).not.toBe(signedPayload(payload!, 'cron-secret'))
  })

  it('throws in production when PRO_DATA_SECRET is missing even if CRON_SECRET exists', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PRO_DATA_SECRET', '')
    vi.stubEnv('CRON_SECRET', 'cron-secret')

    expect(() => getProDataSecret()).toThrow('PRO_DATA_SECRET')
  })

  it('expires newly issued session tokens after the cookie lifetime', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-secret')

    const token = createProSessionToken('sub_123', 1)
    expect(parseProSessionToken(token)).toEqual({ sid: 'sub_123', sv: 1 })

    vi.setSystemTime(new Date('2026-02-01T00:00:01Z'))
    expect(parseProSessionToken(token)).toBeNull()
  })

  it('still accepts older signed session tokens without exp', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PRO_DATA_SECRET', 'pro-secret')

    const payload = Buffer.from(JSON.stringify({ sid: 'sub_123', v: 1 }), 'utf8').toString('base64url')
    const token = `${payload}.${signedPayload(payload, 'pro-secret')}`

    expect(parseProSessionToken(token)).toEqual({ sid: 'sub_123', sv: 1 })
  })

  it('does not fall back to ROM Telegram secrets in production', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('TELEGRAM_PRO_BOT_TOKEN', '')
    vi.stubEnv('TELEGRAM_PRO_WEBHOOK_SECRET', '')
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'rom-bot-token')
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'rom-webhook-secret')

    expect(getTelegramProBotToken()).toBe('')
    expect(getTelegramProWebhookSecret()).toBe('')
  })

  it('uses dedicated Pro secrets in production when configured', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('TELEGRAM_PRO_BOT_TOKEN', 'pro-bot-token')
    vi.stubEnv('TELEGRAM_PRO_WEBHOOK_SECRET', 'pro-webhook-secret')
    vi.stubEnv('WHATSAPP_PRO_VERIFY_TOKEN', 'pro-verify-token')
    vi.stubEnv('WHATSAPP_PRO_APP_SECRET', 'pro-app-secret')
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'rom-bot-token')
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'rom-webhook-secret')
    vi.stubEnv('WHATSAPP_WEBHOOK_SECRET', 'rom-webhook-secret')
    vi.stubEnv('WHATSAPP_APP_SECRET', 'shared-app-secret')

    expect(getTelegramProBotToken()).toBe('pro-bot-token')
    expect(getTelegramProWebhookSecret()).toBe('pro-webhook-secret')
    expect(getWhatsAppProVerifyToken()).toBe('pro-verify-token')
    expect(getWhatsAppProAppSecret()).toBe('pro-app-secret')
  })

  it('allows ROM Telegram fallbacks outside production for local DX', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('TELEGRAM_PRO_BOT_TOKEN', '')
    vi.stubEnv('TELEGRAM_PRO_WEBHOOK_SECRET', '')
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'rom-bot-token')
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'rom-webhook-secret')

    expect(getTelegramProBotToken()).toBe('rom-bot-token')
    expect(getTelegramProWebhookSecret()).toBe('rom-webhook-secret')
  })

  it('does not fall back to ROM WhatsApp verification or shared app secrets in production', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('WHATSAPP_PRO_VERIFY_TOKEN', '')
    vi.stubEnv('WHATSAPP_PRO_APP_SECRET', '')
    vi.stubEnv('WHATSAPP_WEBHOOK_SECRET', 'rom-webhook-secret')
    vi.stubEnv('WHATSAPP_APP_SECRET', 'shared-app-secret')

    expect(getWhatsAppProVerifyToken()).toBe('')
    expect(getWhatsAppProAppSecret()).toBe('')
  })

  it('allows WhatsApp Pro fallbacks outside production for local DX', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('WHATSAPP_PRO_VERIFY_TOKEN', '')
    vi.stubEnv('WHATSAPP_PRO_APP_SECRET', '')
    vi.stubEnv('WHATSAPP_WEBHOOK_SECRET', 'rom-webhook-secret')
    vi.stubEnv('WHATSAPP_APP_SECRET', 'shared-app-secret')

    expect(getWhatsAppProVerifyToken()).toBe('rom-webhook-secret')
    expect(getWhatsAppProAppSecret()).toBe('shared-app-secret')
  })
})
