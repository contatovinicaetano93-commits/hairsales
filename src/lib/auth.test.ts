import { afterEach, describe, expect, it } from 'vitest'
import {
  canViewRevenue,
  createSessionToken,
  DEFAULT_SHARED_PASSWORD,
  isAuthEnabled,
  isStaffAuthConfigured,
  validateCredentials,
} from '@/lib/auth'

const ENV_KEYS = [
  'ROM_ADMIN_USER',
  'ROM_ADMIN_PASSWORD',
  'ROM_ACCESS_TOKEN',
  'ROM_STAFF_USER',
  'ROM_STAFF_PASSWORD',
  'ROM_PANEL',
  'NEXT_PUBLIC_ROM_PANEL',
] as const

const snapshot = new Map<string, string | undefined>()

function setEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    if (!snapshot.has(key)) snapshot.set(key, process.env[key])
    const value = vars[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const prev = snapshot.get(key)
    if (prev === undefined) delete process.env[key]
    else process.env[key] = prev
  }
  snapshot.clear()
})

describe('auth dual login', () => {
  it('usa Senha@123 em todas as roles mesmo com env de senha diferente', () => {
    setEnv({
      ROM_ADMIN_USER: 'ADMIN-VITRINI',
      ROM_ADMIN_PASSWORD: 'outra-senha-antiga',
      ROM_ACCESS_TOKEN: 'token-antigo',
      ROM_STAFF_USER: 'EQUIPE-VITRINI',
      ROM_STAFF_PASSWORD: 'outra-staff',
      ROM_PANEL: 'vitrini',
      NEXT_PUBLIC_ROM_PANEL: 'vitrini',
    })

    expect(isAuthEnabled()).toBe(true)
    expect(isStaffAuthConfigured()).toBe(true)
    expect(validateCredentials('ADMIN-VITRINI', DEFAULT_SHARED_PASSWORD)).toEqual({
      user: 'ADMIN-VITRINI',
      role: 'admin',
    })
    expect(validateCredentials('EQUIPE-VITRINI', DEFAULT_SHARED_PASSWORD)).toEqual({
      user: 'EQUIPE-VITRINI',
      role: 'staff',
    })
    expect(validateCredentials('FINANCEIRO-VITRINI', DEFAULT_SHARED_PASSWORD)?.role).toBe(
      'financeiro'
    )
    expect(validateCredentials('ESTOQUE-VITRINI', DEFAULT_SHARED_PASSWORD)?.role).toBe('estoque')
    expect(validateCredentials('ADMIN-VITRINI', 'outra-senha-antiga')).toBeNull()
  })

  it('usa usuários padrão do painel quando env de usuário está vazio', () => {
    setEnv({
      ROM_ADMIN_USER: undefined,
      ROM_ADMIN_PASSWORD: undefined,
      ROM_ACCESS_TOKEN: undefined,
      ROM_STAFF_USER: undefined,
      ROM_STAFF_PASSWORD: undefined,
      ROM_PANEL: 'vitrini',
      NEXT_PUBLIC_ROM_PANEL: 'vitrini',
    })

    expect(validateCredentials('ADMIN-VITRINI', 'Senha@123')).toEqual({
      user: 'ADMIN-VITRINI',
      role: 'admin',
    })
    expect(validateCredentials('EQUIPE-VITRINI', 'Senha@123')).toEqual({
      user: 'EQUIPE-VITRINI',
      role: 'staff',
    })
  })

  it('valida admin e staff com roles distintas', () => {
    setEnv({
      ROM_ADMIN_USER: 'ADMIN-BRASIL',
      ROM_ADMIN_PASSWORD: 'Senha@brasil',
      ROM_STAFF_USER: 'FUNC-BRASIL',
      ROM_STAFF_PASSWORD: 'Senha@func',
      ROM_PANEL: 'brasil',
      NEXT_PUBLIC_ROM_PANEL: 'brasil',
    })

    expect(isAuthEnabled()).toBe(true)
    expect(isStaffAuthConfigured()).toBe(true)
    expect(validateCredentials('ADMIN-BRASIL', 'Senha@123')).toEqual({
      user: 'ADMIN-BRASIL',
      role: 'admin',
    })
    expect(validateCredentials('FUNC-BRASIL', 'Senha@123')).toEqual({
      user: 'FUNC-BRASIL',
      role: 'staff',
    })
    expect(validateCredentials('admin-brasil', 'Senha@123')).toEqual({
      user: 'ADMIN-BRASIL',
      role: 'admin',
    })
    expect(validateCredentials('FUNC-BRASIL', 'Senha@brasil')).toBeNull()
    expect(canViewRevenue('admin')).toBe(true)
    expect(canViewRevenue('staff')).toBe(false)
  })

  it('gera tokens de sessão diferentes por role', async () => {
    setEnv({
      ROM_ADMIN_USER: 'admin',
      ROM_ADMIN_PASSWORD: 'admin-pass',
      ROM_STAFF_USER: 'staff',
      ROM_STAFF_PASSWORD: 'staff-pass',
    })

    const adminTok = await createSessionToken('admin', 'admin')
    const staffTok = await createSessionToken('staff', 'staff')
    expect(adminTok).toHaveLength(64)
    expect(staffTok).toHaveLength(64)
    expect(adminTok).not.toEqual(staffTok)
  })
})
