import { describe, expect, it } from 'vitest'
import { getBrand, parseRomPanelId, parseSeedPreset } from '@/lib/brand'

describe('brand', () => {
  it('brasil é o painel padrão', () => {
    const brand = getBrand('brasil')
    expect(brand.displayName).toBe('ROM CLUB BRASIL')
    expect(brand.productName).toBe('ROM CLUB BRASIL')
  })

  it('iguatemi tem branding próprio', () => {
    const brand = getBrand('iguatemi')
    expect(brand.displayName).toBe('ROM CLUB IGUATEMI')
    expect(brand.productName).toBe('ROM CLUB BRASIL')
    expect(brand.locationSubtitle).toBe('IGUATEMI')
  })

  it('parseia painel e seed', () => {
    expect(parseRomPanelId('iguatemi')).toBe('iguatemi')
    expect(parseRomPanelId('iguatuemi')).toBe('iguatemi')
    expect(parseRomPanelId('BRASIL')).toBe('brasil')
    expect(parseSeedPreset('iguatemi')).toBe('iguatemi')
    expect(parseSeedPreset('outro')).toBeNull()
  })
})
