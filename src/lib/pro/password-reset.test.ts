import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/pro/secrets', () => ({
  getProDataSecret: () => 'test-secret-value-not-real',
}))

import {
  createPasswordResetToken,
  verifyPasswordResetToken,
  unsafePeekResetTokenSubscriberId,
} from './password-reset'

const subscriber = { id: 'sub-1', password_hash: 'hash-v1' }

describe('password reset token', () => {
  it('valida um token recém-criado', () => {
    const token = createPasswordResetToken(subscriber)
    expect(verifyPasswordResetToken(token, subscriber)).toBe(true)
  })

  it('expõe o subscriber id sem validar a assinatura (peek)', () => {
    const token = createPasswordResetToken(subscriber)
    expect(unsafePeekResetTokenSubscriberId(token)).toBe('sub-1')
  })

  it('rejeita token depois que a senha muda (password_hash diferente)', () => {
    const token = createPasswordResetToken(subscriber)
    const afterReset = { id: 'sub-1', password_hash: 'hash-v2' }
    expect(verifyPasswordResetToken(token, afterReset)).toBe(false)
  })

  it('rejeita token de outro assinante', () => {
    const token = createPasswordResetToken(subscriber)
    const other = { id: 'sub-2', password_hash: 'hash-v1' }
    expect(verifyPasswordResetToken(token, other)).toBe(false)
  })

  it('rejeita token expirado', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = createPasswordResetToken(subscriber)

    vi.setSystemTime(new Date('2026-01-01T01:00:01Z')) // 1h + 1s depois
    expect(verifyPasswordResetToken(token, subscriber)).toBe(false)
    vi.useRealTimers()
  })

  it('rejeita token malformado', () => {
    expect(verifyPasswordResetToken('lixo-sem-ponto', subscriber)).toBe(false)
    expect(verifyPasswordResetToken('', subscriber)).toBe(false)
  })

  it('rejeita assinatura adulterada', () => {
    const token = createPasswordResetToken(subscriber)
    const [payload] = token.split('.')
    const tampered = `${payload}.assinatura-forjada-xxxxxxxxxxxxxxxxxxxxxxxx`
    expect(verifyPasswordResetToken(tampered, subscriber)).toBe(false)
  })
})
