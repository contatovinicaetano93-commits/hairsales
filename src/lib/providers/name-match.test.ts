import { describe, expect, it } from 'vitest'
import { matchSubscriberName, nameMatchesProfessional, normalizeProKey } from './name-match'

describe('matchSubscriberName', () => {
  it('casa nome exato ignorando acento/case', () => {
    const r = matchSubscriberName('dani mariniello', ['Dani Mariniello', 'Walter'])
    expect(r.status).toBe('matched')
    if (r.status === 'matched') expect(r.canonicalName).toBe('Dani Mariniello')
  })

  it('retorna ambiguous quando há dois candidatos parciais', () => {
    const r = matchSubscriberName('Lucas', ['Lucas Silva', 'Lucas Souza'])
    expect(r.status).toBe('ambiguous')
  })

  it('retorna not_found quando não há match', () => {
    const r = matchSubscriberName('Maria', ['Dani Mariniello', 'Walter'])
    expect(r.status).toBe('not_found')
  })
})

describe('nameMatchesProfessional', () => {
  it('aceita alias', () => {
    expect(
      nameMatchesProfessional('Dani', {
        canonicalName: 'Dani Mariniello',
        aliases: ['Dani Mariniello', 'Dani'],
      }),
    ).toBe(true)
  })

  it('normaliza chave', () => {
    expect(normalizeProKey('José  Ávila')).toBe('jose avila')
  })
})
