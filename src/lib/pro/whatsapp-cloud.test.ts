import { describe, expect, it } from 'vitest'
import { normalizeWaPhone, WA_MONTHLY_INCLUDED } from './whatsapp-cloud'

describe('WhatsApp Cloud credits', () => {
  it('Free sem utility; Pro com 200 utility e 0 marketing incluso', () => {
    expect(WA_MONTHLY_INCLUDED.free.utility).toBe(0)
    expect(WA_MONTHLY_INCLUDED.pro.utility).toBe(200)
    expect(WA_MONTHLY_INCLUDED.pro.marketing).toBe(0)
  })

  it('normaliza telefone', () => {
    expect(normalizeWaPhone('+55 (11) 98765-4321')).toBe('5511987654321')
  })
})
