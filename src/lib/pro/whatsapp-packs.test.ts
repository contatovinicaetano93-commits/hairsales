import { describe, expect, it } from 'vitest'
import { getMarketingPack, listMarketingPacks } from './pack-catalog'

describe('marketing packs', () => {
  it('oferece 50/100/250', () => {
    const ids = listMarketingPacks().map((p) => p.id)
    expect(ids).toEqual(['mkt_50', 'mkt_100', 'mkt_250'])
    expect(getMarketingPack('mkt_100')?.credits).toBe(100)
  })
})
