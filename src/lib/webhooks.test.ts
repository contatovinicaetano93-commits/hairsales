import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { isTelegramChatAllowed, verifyTelegramWebhook, verifyWhatsAppWebhook } from '@/lib/webhooks'

function mockReq(headers: Record<string, string> = {}, url = 'https://example.com/api/webhooks/whatsapp') {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  )
  return {
    headers: {
      get: (name: string) => normalized[name.toLowerCase()] ?? null,
    },
    nextUrl: new URL(url),
  } as unknown as NextRequest
}

describe('webhook auth', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: 'production', VERCEL_ENV: 'production' }
  })

  afterEach(() => {
    process.env = env
  })

  it('bloqueia WhatsApp em produção sem secret configurado', () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET
    const result = verifyWhatsAppWebhook(mockReq())
    expect(result.ok).toBe(false)
  })

  it('aceita WhatsApp com secret correto', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'abc'
    const result = verifyWhatsAppWebhook(mockReq({ 'x-webhook-secret': 'abc' }))
    expect(result.ok).toBe(true)
  })

  it('ignora secret de WhatsApp via query string em produção', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'abc'
    const result = verifyWhatsAppWebhook(
      mockReq({}, 'https://example.com/api/webhooks/whatsapp?secret=abc')
    )
    expect(result.ok).toBe(false)
  })

  it('aceita secret de WhatsApp via query string fora de produção', () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.WHATSAPP_WEBHOOK_SECRET = 'abc'
    const result = verifyWhatsAppWebhook(
      mockReq({}, 'https://example.com/api/webhooks/whatsapp?secret=abc')
    )
    expect(result.ok).toBe(true)
  })

  it('bloqueia Telegram chat fora da allowlist', () => {
    process.env.TELEGRAM_STAFF_CHAT_IDS = '111,222'
    const result = isTelegramChatAllowed(999)
    expect(result.ok).toBe(false)
  })

  it('aceita Telegram chat na allowlist', () => {
    process.env.TELEGRAM_STAFF_CHAT_IDS = '111,222'
    const result = isTelegramChatAllowed(222)
    expect(result.ok).toBe(true)
  })

  it('rejeita Telegram webhook com secret errado', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'real'
    const result = verifyTelegramWebhook(mockReq({ 'x-telegram-bot-api-secret-token': 'wrong' }))
    expect(result.ok).toBe(false)
  })
})
