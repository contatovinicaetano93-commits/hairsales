import { describe, expect, it } from 'vitest'
import { trinksProvider } from './adapter'

describe('trinksProvider mock', () => {
  it('está disponível', () => {
    expect(trinksProvider.available).toBe(true)
    expect(trinksProvider.id).toBe('trinks')
  })

  it('resolve profissional pelo nome com token mock', async () => {
    const r = await trinksProvider.resolveProfessional({
      token: 'mock',
      displayName: 'Dani Mariniello',
      unitExternalId: 'est-1',
    })
    expect(r.status).toBe('matched')
    if (r.status === 'matched') {
      expect(r.canonicalName).toBe('Dani Mariniello')
      expect(r.externalId).toBe('101')
    }
  })

  it('traz só agenda do profissional no mock', async () => {
    const appts = await trinksProvider.fetchAppointments({
      token: 'mock',
      professional: {
        externalId: '101',
        canonicalName: 'Dani Mariniello',
        aliases: ['Dani Mariniello'],
      },
      unitExternalId: 'est-1',
    })
    expect(appts.length).toBeGreaterThan(0)
    expect(appts.every((a) => a.professionalName === 'Dani Mariniello')).toBe(true)
  })
})
